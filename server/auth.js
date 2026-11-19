// Kimlik: e-posta + parola (bcrypt), JWT (jose, HS256), bellek içi hız sınırı, SMTP e-postası.
import bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import nodemailer from "nodemailer";

import {
  APP_URL,
  JWT_SECRET,
  SMTP_FROM,
  SMTP_HOST,
  SMTP_PASSWORD,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  TOKEN_DAYS,
} from "./config.js";
import { HttpError } from "./http.js";
import { assertNotBanned, moderationState } from "./moderation.js";
import { getStore, newId, nowIso } from "./store.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_RE = /^[a-z0-9][a-z0-9_.-]{2,31}$/;
const KEY = new TextEncoder().encode(JWT_SECRET);
const BCRYPT_ROUNDS = 12;
// Kullanıcı yokken de bcrypt çalıştır: yanıt süresi hesabın varlığını sızdırmasın.
const DUMMY_HASH = "$2b$12$" + "x".repeat(53);

export async function hashPassword(password) {
  return bcrypt.hash(Buffer.from(password).subarray(0, 72).toString(), BCRYPT_ROUNDS);
}

export async function checkPassword(password, hashed) {
  try {
    return await bcrypt.compare(Buffer.from(password).subarray(0, 72).toString(), hashed);
  } catch {
    return false;
  }
}

export async function makeToken(user, purpose = "access", minutes = null) {
  const lifetime = minutes ? minutes * 60 : TOKEN_DAYS * 86400;
  const payload = { purpose };
  if (purpose === "reset") payload.ph = user.password_hash.slice(-16); // parola değişince token geçersiz

  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime(now + lifetime)
    .sign(KEY);
}

export async function decodeToken(token, purpose = "access") {
  try {
    const { payload } = await jwtVerify(token, KEY, { algorithms: ["HS256"] });
    return payload.purpose === purpose ? payload : null;
  } catch {
    return null;
  }
}

export function publicUser(user) {
  const moderation = moderationState(user);
  return {
    id: user.id,
    email: user.email ?? null,
    username: user.username ?? null,
    telegram_linked: Boolean(user.telegram_chat_id),
    full_name: user.full_name || user.username || String(user.email || "").split("@")[0] || "üye",
    role: user.role || "user",
    email_verified: user.email_verified !== false,
    banned: moderation.banned,
    ban_reason: moderation.ban_reason,
    muted: moderation.muted,
    mute_reason: moderation.mute_reason,
    created_date: user.created_date ?? null,
  };
}

export async function userByEmail(email) {
  const clean = String(email || "").trim().toLowerCase();
  if (!clean) return null;
  const store = await getStore();
  const [found] = await store.find("users", { email: clean }, "-created_date", 1);
  return found ?? null;
}

/** Kullanıcı adını küçük harfe çevirir ve biçimini doğrular. */
export function normalizeUsername(value) {
  const clean = String(value || "").trim().toLowerCase();
  if (!USERNAME_RE.test(clean)) {
    throw new HttpError(400, "Kullanıcı adı 3–32 karakter olmalı; harf, rakam, nokta, tire ve alt çizgi kullan");
  }
  return clean;
}

export async function userByUsername(username) {
  const clean = String(username || "").trim().toLowerCase();
  if (!clean) return null;
  const store = await getStore();
  const [found] = await store.find("users", { username: clean }, "-created_date", 1);
  return found ?? null;
}

/** Giriş alanı e-posta da kullanıcı adı da olabilir. */
export async function userByLogin(login) {
  const clean = String(login || "").trim().toLowerCase();
  if (!clean) return null;
  return (await userByEmail(clean)) || (await userByUsername(clean));
}

export async function userFromToken(token) {
  if (!token) return null;
  const data = await decodeToken(token);
  if (!data?.sub) return null;
  const store = await getStore();
  return store.get("users", data.sub);
}

function bearer(header) {
  if (!header || typeof header !== "string") return null;
  return header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : null;
}

export async function currentUser(request) {
  return userFromToken(bearer(request.headers.authorization));
}

export async function requireUser(request) {
  const user = await currentUser(request);
  if (!user) throw new HttpError(401, "Oturum gerekli");
  assertNotBanned(user);
  return user;
}

/**
 * Yeni üye oluşturur. E-posta ve/veya kullanıcı adı verilebilir; yöntem
 * "email" dışındaysa e-posta zorunlu değildir (yalnızca kullanıcı adı).
 */
export async function createUser({ email = "", username = "", password = "", fullName = "", emailVerified = true } = {}) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanUsername = username ? normalizeUsername(username) : "";

  if (!cleanEmail && !cleanUsername) throw new HttpError(400, "Kullanıcı adı gerekli");
  if (cleanEmail && !EMAIL_RE.test(cleanEmail)) throw new HttpError(400, "Geçerli bir e-posta gir");
  if (String(password || "").length < 8) throw new HttpError(400, "Parola en az 8 karakter olmalı");
  if (cleanUsername && ["admin", "root", "system", "krypt"].includes(cleanUsername)) {
    throw new HttpError(400, "Bu kullanıcı adı ayrılmış");
  }

  const store = await getStore();
  if (cleanEmail && (await userByEmail(cleanEmail))) throw new HttpError(409, "Bu e-posta ile zaten bir hesap var");
  if (cleanUsername && (await userByUsername(cleanUsername))) {
    throw new HttpError(409, "Bu kullanıcı adı zaten alınmış");
  }

  // Yönetici, admin.json dosyasındaki hesaptır; kayıt olan herkes normal üyedir.
  return store.create("users", {
    id: newId(),
    email: cleanEmail || null,
    username: cleanUsername || null,
    password_hash: await hashPassword(password),
    full_name: String(fullName || "").trim().slice(0, 80) || cleanUsername || cleanEmail.split("@")[0] || "",
    role: "user",
    email_verified: emailVerified,
    created_date: nowIso(),
  });
}

// ------------------------------------------------------------------ Hız sınırı
const hits = new Map();

export function rateLimit(key, limit = 10, windowSeconds = 300) {
  const now = Date.now() / 1000;
  const list = (hits.get(key) || []).filter((at) => at >= now - windowSeconds);

  if (list.length >= limit) {
    throw new HttpError(429, "Çok fazla deneme. Biraz sonra tekrar dene.");
  }

  list.push(now);
  hits.set(key, list);

  if (hits.size > 5000) {
    for (const [entry, values] of hits) {
      if (!values.some((at) => at >= now - windowSeconds)) hits.delete(entry);
    }
  }
}

export function clientIp(request) {
  return request.ip || request.socket?.remoteAddress || "unknown";
}

// ------------------------------------------------------------------ E-posta
let transporter = null;

function mailer() {
  if (!SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined,
    connectionTimeout: 15_000,
  });
  return transporter;
}

// Son postalama denemeleri: panelde "e-posta neden gelmedi" sorusunu yanıtlar.
const OUTBOX_LIMIT = 25;
const outbox = [];

/** SMTP durumu ve son gönderim denemeleri (yalnızca yönetici ucu kullanır). */
export function mailStatus() {
  return {
    smtp_configured: Boolean(SMTP_HOST),
    smtp_host: SMTP_HOST || null,
    from: SMTP_FROM,
    recent: outbox.slice().reverse(),
  };
}

export async function sendMail(to, subject, body) {
  const transport = mailer();
  const entry = { at: nowIso(), to, subject, body, delivered: false, error: "" };

  if (!transport) {
    entry.error = "SMTP ayarlı değil (SMTP_HOST boş)";
    console.log(`\n[MAIL — SMTP ayarlı değil] Kime: ${to}\n${subject}\n${body}\n`);
  } else {
    try {
      const info = await transport.sendMail({ from: SMTP_FROM, to, subject, text: body });
      entry.delivered = true;
      entry.message_id = info?.messageId || "";
    } catch (error) {
      entry.error = error.message;
      console.warn(`[MAIL] gönderilemedi (${to}): ${error.message}`);
    }
  }

  outbox.push(entry);
  if (outbox.length > OUTBOX_LIMIT) outbox.shift();
  return entry;
}

export function resetLink(token) {
  return `${APP_URL}/reset-password?token=${token}`;
}

export function verifyLink(token) {
  return `${APP_URL}/verify-email?token=${token}`;
}

/** Elle iletmek için taze bir doğrulama bağlantısı üretir (posta göndermez). */
export async function verificationLink(user) {
  const token = await makeToken(user, "verify", 60 * 48);
  return verifyLink(token);
}

/** Doğrulama bağlantısını e-postayla gönderir (SMTP yoksa konsola yazar). */
export async function sendVerificationMail(user) {
  const link = await verificationLink(user);

  const mail = await sendMail(
    user.email,
    "KRYPT — e-posta doğrulama",
    `Hesabını doğrulamak için bu bağlantıyı aç (48 saat geçerli):\n${link}\n`,
  );

  return { link, mail };
}
