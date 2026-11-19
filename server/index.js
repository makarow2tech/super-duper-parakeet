// KRYPT API — Node.js (Express 5) sunucusu.
// Tek süreç hem /api'yi hem derlenmiş ön yüzü (dist/client) sunar.
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

import express from "express";
import { z } from "zod";

import {
  ALLOW_REGISTRATION,
  CORS_ORIGINS,
  DB_BACKEND,
  DB_LABEL,
  DB_TARGET,
  ENV_FILE,
  FRONTEND_DIR,
  HOST,
  PORT,
  REGISTER_RATE_LIMIT,
  TELEGRAM_BOT_USERNAME,
  TELEGRAM_WEBHOOK_SECRET,
  TRUST_PROXY,
  TURNSTILE_SECRET_KEY,
  TURNSTILE_SITE_KEY,
} from "./config.js";
import {
  checkPassword,
  clientIp,
  createUser,
  decodeToken,
  hashPassword,
  makeToken,
  publicUser,
  rateLimit,
  requireUser,
  resetLink,
  sendMail,
  sendVerificationMail,
  userByEmail,
  userByLogin,
  userByUsername,
} from "./auth.js";
import {
  captchaProvider,
  emailVerificationRequired,
  ensureFileAdmin,
  getSettings,
  registrationMethod,
} from "./admin.js";
import { createLocalChallenge, enforceCaptcha, resolveCaptchaProvider, turnstileReady } from "./captcha.js";
import { consumeInvite, requireUsableInvite } from "./invites.js";
import {
  createTelegramVerification,
  handleWebhookUpdate,
  startTelegramPolling,
  stopTelegramPolling,
  telegramEnabled,
  telegramStatus,
} from "./telegram.js";
import { assertNotBanned, assertNotMuted } from "./moderation.js";
import adminRouter from "./adminApi.js";
import { ENTITIES, ruleQuery } from "./entities.js";
import { HttpError, parseBody } from "./http.js";
import { matches, validateQuery } from "./query.js";
import { hub } from "./realtime.js";
import { closeStore, getStore, nowIso } from "./store.js";

const MAX_FIELD = 200_000; // tek alan için karakter üst sınırı (şifreli mesaj blokları dahil)

const app = express();
app.disable("x-powered-by");
if (TRUST_PROXY) app.set("trust proxy", 1);

// 32 MB: yönetici veritabanı yedeği yüklerken büyük gövde kabul edilir.
app.use(express.json({ limit: "32mb" }));

if (CORS_ORIGINS.length) {
  app.use((request, response, next) => {
    const origin = request.headers.origin;
    if (origin && CORS_ORIGINS.includes(origin)) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Vary", "Origin");
      response.setHeader("Access-Control-Allow-Methods", "*");
      response.setHeader("Access-Control-Allow-Headers", "*");
    }
    if (request.method === "OPTIONS") return response.sendStatus(204);
    next();
  });
}

const route = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);

// ------------------------------------------------------------------ Sağlık
app.get("/api/health", (request, response) => {
  // Parola içermez: hangi veritabanına bağlandığını doğrulamak için özet.
  response.json({ ok: true, backend: DB_BACKEND, label: DB_LABEL, target: DB_TARGET });
});

// ------------------------------------------------------------------ Genel ayarlar
// Ön yüz site adını ve duyuruyu buradan okur; parola/anahtar içermez.
app.get(
  "/api/settings",
  route(async (request, response) => {
    const settings = await getSettings();
    const method = await registrationMethod();
    const provider = resolveCaptchaProvider(await captchaProvider(), method);

    response.json({
      site_name: settings.site_name || "KRYPT",
      motd: settings.motd || "",
      allow_registration: ALLOW_REGISTRATION && settings.allow_registration !== false,
      require_email_verification: method === "email" && (await emailVerificationRequired()),
      registration_method: method,
      captcha_provider: provider,
      captcha_ready: provider === "turnstile" ? turnstileReady() : true,
      turnstile_site_key: provider === "turnstile" ? TURNSTILE_SITE_KEY : "",
      telegram_bot_username: telegramEnabled() ? TELEGRAM_BOT_USERNAME : "",
    });
  }),
);

// ------------------------------------------------------------------ Captcha
// Yerel captcha: rastgele yazı + tek kullanımlık kimlik. Turnstile: site anahtarı.
app.get(
  "/api/captcha",
  route(async (request, response) => {
    const method = await registrationMethod();
    const provider = resolveCaptchaProvider(await captchaProvider(), method);

    if (provider === "local") return response.json({ provider, challenge: createLocalChallenge() });
    if (provider === "turnstile") {
      return response.json({ provider, site_key: TURNSTILE_SITE_KEY || "", ready: turnstileReady() });
    }
    response.json({ provider: "none" });
  }),
);

// ------------------------------------------------------------------ Kimlik
const RegisterBody = z.object({
  email: z.string().max(320).optional().default(""),
  username: z.string().max(32).optional().default(""),
  password: z.string().max(200),
  full_name: z.string().max(80).optional().default(""),
  invite_code: z.string().max(64).optional().default(""),
  captcha_id: z.string().max(80).optional().default(""),
  captcha_answer: z.string().max(120).optional().default(""),
  turnstile_token: z.string().max(4096).optional().default(""),
});

app.post(
  "/api/auth/register",
  route(async (request, response) => {
    if (!ALLOW_REGISTRATION) throw new HttpError(403, "Yeni kayıtlar kapalı");
    if (!(await getSettings()).allow_registration) {
      throw new HttpError(403, "Yeni kayıtlar yönetici tarafından kapatıldı");
    }

    const method = await registrationMethod();
    const body = parseBody(RegisterBody, request.body);
    rateLimit(`reg:${clientIp(request)}`, REGISTER_RATE_LIMIT);

    // İnsan doğrulaması: .env/panel seçimine göre yerel captcha veya Turnstile.
    const provider = resolveCaptchaProvider(await captchaProvider(), method);
    await enforceCaptcha(provider, body, request);

    const invite = method === "invite" ? await requireUsableInvite(body.invite_code) : null;

    if (method === "email" && !body.email.trim()) throw new HttpError(400, "E-posta gerekli");
    if (method !== "email" && !body.username.trim()) throw new HttpError(400, "Kullanıcı adı gerekli");
    if (method === "telegram" && !telegramEnabled()) {
      throw new HttpError(
        503,
        "Telegram botu ayarlı değil. .env dosyasına TELEGRAM_BOT_TOKEN ve TELEGRAM_BOT_USERNAME yaz.",
        "telegram_unconfigured",
      );
    }

    const needsVerification = method === "email" && (await emailVerificationRequired());
    const user = await createUser({
      email: method === "email" ? body.email : "",
      username: method === "email" ? "" : body.username,
      password: body.password,
      fullName: body.full_name,
      emailVerified: !needsVerification,
    });

    // Kod yalnızca hesap gerçekten oluşturulduysa tüketilir.
    if (invite) await consumeInvite(invite);

    if (needsVerification) {
      // Oturum açılmaz: önce e-postadaki bağlantı doğrulanmalı.
      const { mail } = await sendVerificationMail(user);
      return response.json({
        verification_required: true,
        method: "email",
        email: user.email,
        mail_sent: mail.delivered,
      });
    }

    if (method === "telegram") {
      // Hesap doğrulanana kadar oturum yok; istemci kodu yoklayacak.
      return response.json({
        verification_required: true,
        method: "telegram",
        username: user.username,
        telegram: createTelegramVerification(user),
      });
    }

    response.json({ access_token: await makeToken(user), user: publicUser(user) });
  }),
);

const LoginBody = z.object({
  email: z.string().max(320).optional().default(""),
  login: z.string().max(320).optional().default(""),
  password: z.string().max(200),
});

app.post(
  "/api/auth/login",
  route(async (request, response) => {
    const body = parseBody(LoginBody, request.body);
    const login = (body.login || body.email).trim();
    rateLimit(`login:${clientIp(request)}:${login.toLowerCase()}`, 8);

    const user = await userByLogin(login);
    const ok = await checkPassword(body.password, user?.password_hash || "$2b$12$" + "x".repeat(53));

    if (!user || !ok) throw new HttpError(401, "Kullanıcı adı/e-posta veya parola hatalı");
    assertNotBanned(user);

    const method = await registrationMethod();

    if (method === "email" && (await emailVerificationRequired()) && user.email_verified === false) {
      throw new HttpError(403, "Önce e-posta adresini doğrula", "email_unverified");
    }
    if (method === "telegram" && user.email_verified === false) {
      throw new HttpError(403, "Önce Telegram botundan hesabını doğrula", "telegram_unverified");
    }

    response.json({ access_token: await makeToken(user), user: publicUser(user) });
  }),
);

// Telegram kaydı: kod botta onaylandı mı? Onaylandıysa oturum açılır.
app.post(
  "/api/auth/telegram/status",
  route(async (request, response) => {
    const body = parseBody(z.object({ code: z.string().min(1).max(64) }), request.body);
    rateLimit(`tgstatus:${clientIp(request)}`, 120, 60);

    const state = telegramStatus(body.code);
    if (state.status !== "verified") return response.json({ status: state.status });

    const store = await getStore();
    const user = state.userId ? await store.get("users", state.userId) : null;
    if (!user) throw new HttpError(400, "Hesap bulunamadı");

    response.json({ status: "verified", access_token: await makeToken(user), user: publicUser(user) });
  }),
);

// Telegram kaydı: kodun süresi doldu / tarayıcı kapandı — aynı hesap için yeni kod.
// Parola doğrulanır; hesap zaten doğrulanmışsa yeni kod verilmez.
app.post(
  "/api/auth/telegram/resend",
  route(async (request, response) => {
    const body = parseBody(
      z.object({ username: z.string().min(1).max(32), password: z.string().max(200) }),
      request.body,
    );
    rateLimit(`tgresend:${clientIp(request)}:${body.username.toLowerCase()}`, 5, 300);

    if (!telegramEnabled()) {
      throw new HttpError(
        503,
        "Telegram botu ayarlı değil. .env dosyasına TELEGRAM_BOT_TOKEN ve TELEGRAM_BOT_USERNAME yaz.",
        "telegram_unconfigured",
      );
    }

    const user = await userByUsername(body.username);
    const ok = await checkPassword(body.password, user?.password_hash || "$2b$12$" + "x".repeat(53));
    if (!user || !ok) throw new HttpError(401, "Kullanıcı adı veya parola hatalı");
    assertNotBanned(user);

    if (user.email_verified !== false) {
      throw new HttpError(400, "Bu hesap zaten doğrulanmış; giriş yapabilirsin", "already_verified");
    }

    response.json({ telegram: createTelegramVerification(user) });
  }),
);

// Telegram webhook (yoklama kullanılmıyorsa). Telegram'da setWebhook ile bağlanır.
app.post(
  "/api/telegram/webhook",
  route(async (request, response) => {
    if (!telegramEnabled()) throw new HttpError(503, "Telegram botu ayarlı değil");
    if (TELEGRAM_WEBHOOK_SECRET && request.headers["x-telegram-bot-api-secret-token"] !== TELEGRAM_WEBHOOK_SECRET) {
      throw new HttpError(401, "Webhook gizli anahtarı hatalı");
    }

    await handleWebhookUpdate(request.body);
    response.json({ ok: true });
  }),
);

app.post(
  "/api/auth/verify-email",
  route(async (request, response) => {
    const body = parseBody(z.object({ token: z.string().min(1) }), request.body);
    const data = await decodeToken(body.token, "verify");
    const store = await getStore();
    const user = data?.sub ? await store.get("users", data.sub) : null;

    if (!user) throw new HttpError(400, "Bağlantı geçersiz veya süresi dolmuş", "verify_invalid");

    const updated = await store.update("users", user.id, { email_verified: true, updated_date: nowIso() });
    response.json({ access_token: await makeToken(updated), user: publicUser(updated) });
  }),
);

app.post(
  "/api/auth/resend-verification",
  route(async (request, response) => {
    const body = parseBody(z.object({ email: z.string().min(1).max(320) }), request.body);
    rateLimit(`verify:${clientIp(request)}`, 5);

    const user = await userByEmail(body.email);
    let mailSent = true;

    if (user && user.email_verified === false) {
      const { mail } = await sendVerificationMail(user);
      mailSent = mail.delivered;
    }

    // Hesabın var olup olmadığını sızdırma.
    response.json({ ok: true, mail_sent: mailSent });
  }),
);

app.get(
  "/api/auth/me",
  route(async (request, response) => {
    response.json(publicUser(await requireUser(request)));
  }),
);

app.post(
  "/api/auth/forgot",
  route(async (request, response) => {
    const body = parseBody(z.object({ email: z.string().min(1).max(320) }), request.body);
    rateLimit(`forgot:${clientIp(request)}`, 5);

    const user = await userByEmail(body.email);
    if (user) {
      // Hesap var mı bilgisini sızdırma: yanıt her zaman aynı.
      const token = await makeToken(user, "reset", 60);
      await sendMail(
        user.email,
        "KRYPT parola sıfırlama",
        `Parolanı sıfırlamak için (1 saat geçerli):\n${resetLink(token)}\n`,
      );
    }

    response.json({ ok: true });
  }),
);

app.post(
  "/api/auth/reset",
  route(async (request, response) => {
    const body = parseBody(
      z.object({ token: z.string().min(1), new_password: z.string().max(200) }),
      request.body,
    );

    const data = await decodeToken(body.token, "reset");
    const store = await getStore();
    const user = data?.sub ? await store.get("users", data.sub) : null;

    if (!user || user.password_hash.slice(-16) !== data.ph) {
      throw new HttpError(400, "Bağlantı geçersiz veya süresi dolmuş");
    }
    if (body.new_password.length < 8) throw new HttpError(400, "Parola en az 8 karakter olmalı");

    await store.update("users", user.id, { password_hash: await hashPassword(body.new_password) });
    response.json({ ok: true });
  }),
);

// ------------------------------------------------------------------ Varlıklar
function entity(name) {
  const spec = ENTITIES[name];
  if (!spec) throw new HttpError(404, "Bilinmeyen varlık");
  return spec;
}

function clean(name, data, partial) {
  const spec = entity(name);
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new HttpError(400, "Geçersiz gövde");

  // id, created_by_id vb. istemciden alınmaz.
  const out = Object.fromEntries(Object.entries(data).filter(([key]) => spec.fields.includes(key)));

  for (const [key, value] of Object.entries(out)) {
    if (typeof value === "string" && value.length > MAX_FIELD) {
      throw new HttpError(413, `'${key}' çok uzun`);
    }
    const allowed = spec.enums?.[key];
    if (allowed && !allowed.includes(value)) throw new HttpError(400, `'${key}' için geçersiz değer`);
  }

  if (!partial) {
    const missing = spec.required.filter((key) => out[key] === undefined || out[key] === null || out[key] === "");
    if (missing.length) throw new HttpError(400, `Eksik alan: ${missing.join(", ")}`);
  }

  return out;
}

async function checkUnique(name, data, excludeId = null) {
  const store = await getStore();

  for (const field of ENTITIES[name].unique || []) {
    if (data[field] === undefined) continue;
    for (const other of await store.find(name, { [field]: data[field] }, "-created_date", 2)) {
      if (other.id !== excludeId) throw new HttpError(409, `'${field}' zaten kullanılıyor`);
    }
  }
}

function scoped(name, action, user, query) {
  const q = query || {};
  try {
    validateQuery(q);
  } catch (error) {
    throw new HttpError(400, error.message);
  }

  const rls = ruleQuery(name, action, user);
  const hasQ = Object.keys(q).length > 0;
  const hasRls = Object.keys(rls).length > 0;

  if (hasQ && hasRls) return { $and: [q, rls] };
  return hasQ ? q : hasRls ? rls : {};
}

const QueryBody = z.object({
  query: z.record(z.string(), z.any()).optional().default({}),
  sort: z.string().max(60).nullable().optional().default(null),
  limit: z.number().int().min(1).max(500).optional().default(50),
  skip: z.number().int().min(0).optional().default(0),
});

app.post(
  "/api/entities/:name/query",
  route(async (request, response) => {
    const { name } = request.params;
    entity(name);
    const user = await requireUser(request);
    const body = parseBody(QueryBody, request.body);

    const store = await getStore();
    const items = await store.find(
      name,
      scoped(name, "read", user, body.query),
      body.sort || "-created_date",
      body.limit,
      body.skip,
    );

    response.json({ items });
  }),
);

app.post(
  "/api/entities/:name/count",
  route(async (request, response) => {
    const { name } = request.params;
    entity(name);
    const user = await requireUser(request);
    const body = parseBody(
      z.object({ query: z.record(z.string(), z.any()).optional().default({}) }).default({}),
      request.body,
    );

    const store = await getStore();
    response.json({ count: await store.count(name, scoped(name, "read", user, body.query)) });
  }),
);

app.get(
  "/api/entities/:name/:rid",
  route(async (request, response) => {
    const { name, rid } = request.params;
    entity(name);
    const user = await requireUser(request);

    const store = await getStore();
    const doc = await store.get(name, rid);

    if (!doc || !matches(doc, ruleQuery(name, "read", user))) {
      throw new HttpError(404, "Kayıt bulunamadı");
    }
    response.json(doc);
  }),
);

async function insert(name, data, user, enforce = true) {
  // Susturulmuş hesap okuyabilir ama yeni mesaj/kanal/topluluk üretemez.
  if (enforce && ["Message", "Channel", "Community"].includes(name)) assertNotMuted(user);

  if (enforce && (name === "Channel" || name === "Community")) {
    const settings = await getSettings();
    const blocked =
      (name === "Channel" && !settings.allow_channels) ||
      (name === "Community" && !settings.allow_communities);
    if (blocked && user.role !== "admin") {
      throw new HttpError(403, "Bu işlem yönetici tarafından kapatıldı");
    }
  }

  const cleanData = clean(name, data, false);
  await checkUnique(name, cleanData);

  const stamp = nowIso();
  const doc = {
    ...cleanData,
    created_by_id: user.id,
    created_by: user.email,
    created_date: stamp,
    updated_date: stamp,
  };

  if (enforce && !matches(doc, ruleQuery(name, "create", user))) {
    throw new HttpError(403, "Bu kaydı oluşturma yetkin yok");
  }

  if (name === "Report" && !doc.status) doc.status = "open";

  const store = await getStore();
  const created = await store.create(name, doc);
  hub.publish(name, "create", created);
  return created;
}

app.post(
  "/api/entities/:name",
  route(async (request, response) => {
    const { name } = request.params;
    entity(name);
    const user = await requireUser(request);
    response.json(await insert(name, request.body, user));
  }),
);

app.post(
  "/api/entities/:name/bulk",
  route(async (request, response) => {
    const { name } = request.params;
    entity(name);
    const user = await requireUser(request);

    const rows = parseBody(z.array(z.record(z.string(), z.any())), request.body);
    if (rows.length > 200) throw new HttpError(400, "En fazla 200 kayıt");

    const created = [];
    for (const row of rows) created.push(await insert(name, row, user));
    response.json(created);
  }),
);

async function applyUpdate(name, doc, patch, user) {
  if (!matches(doc, ruleQuery(name, "update", user))) {
    throw new HttpError(403, "Bu kaydı güncelleme yetkin yok");
  }

  const cleanPatch = clean(name, patch, true);
  await checkUnique(name, cleanPatch, doc.id);

  const store = await getStore();
  const updated = await store.update(name, doc.id, { ...cleanPatch, updated_date: nowIso() });
  hub.publish(name, "update", updated);
  return updated;
}

app.patch(
  "/api/entities/:name/:rid",
  route(async (request, response) => {
    const { name, rid } = request.params;
    entity(name);
    const user = await requireUser(request);

    const store = await getStore();
    const doc = await store.get(name, rid);
    if (!doc || !matches(doc, ruleQuery(name, "read", user))) {
      throw new HttpError(404, "Kayıt bulunamadı");
    }

    response.json(await applyUpdate(name, doc, request.body, user));
  }),
);

app.post(
  "/api/entities/:name/update-many",
  route(async (request, response) => {
    const { name } = request.params;
    entity(name);
    const user = await requireUser(request);

    const body = parseBody(
      z.object({
        query: z.record(z.string(), z.any()).optional().default({}),
        set: z.record(z.string(), z.any()).optional().default({}),
      }),
      request.body,
    );

    const store = await getStore();
    const docs = await store.find(name, scoped(name, "update", user, body.query), "-created_date", 500);
    for (const doc of docs) await applyUpdate(name, doc, body.set, user);

    response.json({ updated: docs.length });
  }),
);

app.delete(
  "/api/entities/:name/:rid",
  route(async (request, response) => {
    const { name, rid } = request.params;
    entity(name);
    const user = await requireUser(request);

    const store = await getStore();
    const doc = await store.get(name, rid);
    if (!doc || !matches(doc, ruleQuery(name, "read", user))) {
      throw new HttpError(404, "Kayıt bulunamadı");
    }
    if (!matches(doc, ruleQuery(name, "delete", user))) {
      throw new HttpError(403, "Bu kaydı silme yetkin yok");
    }

    await store.delete(name, rid);
    hub.publish(name, "delete", doc);
    response.json({ ok: true });
  }),
);

// ------------------------------------------------------------------ Bildirim dağıtımı
const NotifyBody = z.object({
  channelId: z.string().min(1).max(80),
  type: z.enum(ENTITIES.Notification.enums.type),
  title: z.string().min(1).max(140),
  body: z.string().max(200).optional().default(""),
  onlyUserId: z.string().max(80).nullable().optional().default(null),
});

app.post(
  "/api/notify",
  route(async (request, response) => {
    // Kanal üyelerine bildirim yazar (Notification oluşturmayı yalnızca yönetici
    // yapabildiğinden sunucu bunu hizmet rolüyle yapar). Mesaj içeriği taşımaz:
    // uçtan uca şifreleme korunur.
    const user = await requireUser(request);
    const data = parseBody(NotifyBody, request.body);

    const store = await getStore();
    const channel = await store.get("Channel", data.channelId);
    if (!channel) return response.json({ ok: false, notified: 0 });

    const members = Array.isArray(channel.members) ? channel.members : [];
    if (!members.includes(user.id) && channel.visibility !== "public") {
      return response.json({ ok: false, notified: 0 });
    }

    const targets = (data.onlyUserId ? [data.onlyUserId] : members)
      .filter((id) => id && id !== user.id)
      .slice(0, 200);

    for (const userId of targets) {
      const stamp = nowIso();
      const doc = {
        user_id: userId,
        type: data.type,
        title: data.title,
        body: data.body,
        channel_id: channel.id,
        channel_slug: channel.slug ?? null,
        read: false,
        created_by_id: user.id,
        created_by: user.email,
        created_date: stamp,
        updated_date: stamp,
      };
      hub.publish("Notification", "create", await store.create("Notification", doc));
    }

    response.json({ ok: true, notified: targets.length });
  }),
);

// ------------------------------------------------------------------ Yönetici
app.use("/api/admin", adminRouter);

// ------------------------------------------------------------------ Ön yüz + 404
// Statik dosyalar ve SPA kabuğu, 404 yakalayıcısından ÖNCE bağlanmalı.
installFrontend();

app.use((request, response) => {
  response.status(404).json({ detail: "Bulunamadı" });
});

app.use((error, request, response, next) => {
  if (response.headersSent) return next(error);

  const status = Number(error.status) || (error.type === "entity.parse.failed" ? 400 : 500);
  if (status >= 500) console.error("[api]", error);

  const detail = status >= 500 ? "Sunucu hatası" : error.message || "İstek geçersiz";
  response.status(status).json(error.code ? { detail, code: error.code } : { detail });
});

// ------------------------------------------------------------------ Ön yüz (derlenmiş SPA)
function installFrontend() {
  if (!fs.existsSync(FRONTEND_DIR)) return;

  app.use(express.static(FRONTEND_DIR, { index: false, fallthrough: true }));

  app.use((request, response, next) => {
    if (request.method !== "GET" && request.method !== "HEAD") return next();
    if (request.path.startsWith("/api/")) return next();

    // Eksik .js/.css/.png isteği gerçek 404 olmalı, kabuk dosyası değil.
    const last = request.path.split("/").pop() || "";
    if (last.includes(".")) return next();

    const shell = ["_shell.html", "index.html"]
      .map((file) => path.join(FRONTEND_DIR, file))
      .find((file) => fs.existsSync(file));

    if (!shell) return next();
    response.sendFile(shell);
  });
}

export async function createServer() {
  await getStore();
  // admin.json varsa yönetici hesabını oluştur/eşitle (ilk kayıt olan admin DEĞİLDİR).
  await ensureFileAdmin().catch((error) => console.warn(`[admin] ${error.message}`));

  // Turnstile seçili ama anahtarlar eksikse sessizce kapanmaz: kayıt fail-closed kalır.
  const captchaMode = resolveCaptchaProvider(await captchaProvider(), await registrationMethod());
  if (captchaMode === "turnstile" && (!TURNSTILE_SITE_KEY || !TURNSTILE_SECRET_KEY)) {
    console.warn(
      "[captcha] Turnstile seçili ama TURNSTILE_SITE_KEY / TURNSTILE_SECRET_KEY eksik: " +
        "kayıtlar güvenlik doğrulaması yapılamadığı için reddedilecek (fail-closed).",
    );
  }

  // Bot tokeni varsa Telegram güncellemelerini dinle (webhook kullanılıyorsa atlanır).
  startTelegramPolling().catch((error) => console.warn(`[telegram] ${error.message}`));
  const server = http.createServer(app);
  hub.attach(server);
  return server;
}

async function main() {
  const server = await createServer();

  server.listen(PORT, HOST, () => {
    console.log(`\n  KRYPT  →  http://localhost:${PORT}`);
    console.log(`  Veritabanı: ${DB_LABEL} — ${DB_TARGET}`);
    console.log(`  Ayarlar: ${ENV_FILE}`);
    if (!fs.existsSync(FRONTEND_DIR)) {
      console.log("  Ön yüz derlenmemiş: `npm run build` (geliştirme için `npm run dev`).");
    }
    console.log("");
  });

  const shutdown = async (signal) => {
    console.log(`\n${signal} — kapatılıyor…`);
    stopTelegramPolling();
    hub.close();
    server.close();
    await closeStore().catch(() => {});
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error("Sunucu başlatılamadı:", error.message);
    process.exit(1);
  });
}

export { app };
