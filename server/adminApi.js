// Yönetici API'si: /api/admin/*
// Yalnızca users tablosunda role="admin" olan hesaplar erişebilir.
import express from "express";
import { z } from "zod";

import { mailStatus, requireUser, verificationLink } from "./auth.js";
import {
  ADMIN_FILE,
  captchaProvider,
  getSettings,
  readAdminFile,
  registrationMethod,
  resetSettingsCache,
  saveSettings,
} from "./admin.js";
import { createInvite, inviteState } from "./invites.js";
import { CAPTCHA_PROVIDERS, REGISTRATION_METHODS } from "./config.js";
import { HttpError, parseBody } from "./http.js";
import { moderationState } from "./moderation.js";
import { getStore, nowIso } from "./store.js";
import { telegramEnabled } from "./telegram.js";

export const ADMIN_COLLECTIONS = [
  "users",
  "Profile",
  "Vault",
  "Community",
  "Channel",
  "ChannelMember",
  "Message",
  "Notification",
  "Report",
  "Settings",
  "Invite",
];

const router = express.Router();

const route = (handler) => (request, response, next) =>
  Promise.resolve(handler(request, response, next)).catch(next);

async function requireAdmin(request) {
  const user = await requireUser(request);
  if ((user.role || "user") !== "admin") throw new HttpError(403, "Bu alan yalnızca yöneticilere açık");
  return user;
}

// ------------------------------------------------------------------ Özet
router.get(
  "/summary",
  route(async (request, response) => {
    await requireAdmin(request);
    const store = await getStore();
    const counts = {};

    for (const name of [
      "users",
      "Profile",
      "Channel",
      "Message",
      "Community",
      "Notification",
      "Report",
      "Invite",
    ]) {
      counts[name] = await store.count(name, {});
    }

    const users = await store.find("users", {}, "-created_date", 500);
    const settings = await getSettings();

    response.json({
      counts: {
        users: counts.users,
        profiles: counts.Profile,
        admins: users.filter((row) => row.role === "admin").length,
        channels: counts.Channel,
        messages: counts.Message,
        communities: counts.Community,
        notifications: counts.Notification,
        reports: counts.Report,
        open_reports: await store.count("Report", { status: "open" }),
      },
      settings,
      registration: {
        method: await registrationMethod(),
        captcha: await captchaProvider(),
        telegram_ready: telegramEnabled(),
        invites: counts.Invite ?? 0,
      },
      admin_file: ADMIN_FILE,
      file_admin_email: readAdminFile()?.email ?? null,
    });
  }),
);

// ------------------------------------------------------------------ Üyeler
router.get(
  "/users",
  route(async (request, response) => {
    await requireAdmin(request);
    const store = await getStore();
    const users = await store.find("users", {}, "-created_date", 500);
    const profiles = await store.find("Profile", {}, "-created_date", 500);
    const byUser = new Map(profiles.map((profile) => [profile.user_id, profile]));
    const fileAdmin = readAdminFile()?.email ?? null;

    response.json({
      items: users.map((user) => {
        const profile = byUser.get(user.id);
        const moderation = moderationState(user);
        return {
          id: user.id,
          email: user.email ?? null,
          username: user.username ?? null,
          telegram_linked: Boolean(user.telegram_chat_id),
          full_name: user.full_name || user.username || "",
          role: user.role || "user",
          handle: profile?.handle ?? null,
          display_name: profile?.display_name ?? null,
          created_date: user.created_date ?? null,
          email_verified: user.email_verified !== false,
          is_file_admin: Boolean(user.email) && fileAdmin === user.email,
          ...moderation,
        };
      }),
    });
  }),
);

const RoleBody = z.object({ role: z.enum(["admin", "user"]) });

router.patch(
  "/users/:id/role",
  route(async (request, response) => {
    const actor = await requireAdmin(request);
    const body = parseBody(RoleBody, request.body);
    const store = await getStore();
    const target = await store.get("users", request.params.id);

    if (!target) throw new HttpError(404, "Kullanıcı bulunamadı");
    if (target.id === actor.id && body.role !== "admin") {
      throw new HttpError(400, "Kendi yönetici yetkini kaldıramazsın");
    }

    if (body.role !== "admin") {
      const admins = (await store.find("users", { role: "admin" }, "-created_date", 500)).filter(
        (user) => user.id !== target.id,
      );
      if (admins.length === 0) throw new HttpError(400, "Son yönetici kaldırılamaz");
    }

    const updated = await store.update("users", target.id, { role: body.role, updated_date: nowIso() });
    response.json({ ok: true, user: { id: updated.id, email: updated.email, role: updated.role } });
  }),
);

// ------------------------------------------------------------------ Moderasyon
const ModerationBody = z.object({
  action: z.enum(["ban", "mute", "unban", "unmute"]),
  hours: z.number().int().min(1).max(8760).nullable().optional(),
  reason: z.string().trim().max(200).optional().default(""),
});

router.patch(
  "/users/:id/moderation",
  route(async (request, response) => {
    const actor = await requireAdmin(request);
    const body = parseBody(ModerationBody, request.body);
    const store = await getStore();
    const target = await store.get("users", request.params.id);

    if (!target) throw new HttpError(404, "Kullanıcı bulunamadı");
    if (target.id === actor.id) throw new HttpError(400, "Kendi hesabına ceza uygulayamazsın");
    if (readAdminFile()?.email === target.email) {
      throw new HttpError(400, "admin.json dosyasındaki yönetici banlanamaz");
    }

    const until = body.hours ? new Date(Date.now() + body.hours * 3600_000).toISOString() : null;
    const patch = { updated_date: nowIso() };

    if (body.action === "ban") Object.assign(patch, { banned: true, ban_until: until, ban_reason: body.reason });
    if (body.action === "mute") Object.assign(patch, { muted: true, mute_until: until, mute_reason: body.reason });
    if (body.action === "unban") Object.assign(patch, { banned: false, ban_until: null, ban_reason: "" });
    if (body.action === "unmute") Object.assign(patch, { muted: false, mute_until: null, mute_reason: "" });

    const updated = await store.update("users", target.id, patch);
    response.json({
      ok: true,
      user: { id: updated.id, email: updated.email, ...moderationState(updated) },
    });
  }),
);

router.patch(
  "/users/:id/verify",
  route(async (request, response) => {
    await requireAdmin(request);
    const store = await getStore();
    const target = await store.get("users", request.params.id);
    if (!target) throw new HttpError(404, "Kullanıcı bulunamadı");

    const updated = await store.update("users", target.id, { email_verified: true, updated_date: nowIso() });
    response.json({ ok: true, user: { id: updated.id, email: updated.email, email_verified: true } });
  }),
);

// Doğrulama postası gelmeyen üye için panelden iletilecek bağlantı (posta göndermez).
router.post(
  "/users/:id/verification-link",
  route(async (request, response) => {
    await requireAdmin(request);
    const store = await getStore();
    const target = await store.get("users", request.params.id);
    if (!target) throw new HttpError(404, "Kullanıcı bulunamadı");
    if (target.email_verified !== false) throw new HttpError(400, "Bu üyenin e-postası zaten doğrulanmış");

    response.json({ link: await verificationLink(target), expires_hours: 48 });
  }),
);

// E-posta gönderimi teşhisi: SMTP ayarlı mı, son postalar gitti mi?
router.get(
  "/mail",
  route(async (request, response) => {
    await requireAdmin(request);
    response.json(mailStatus());
  }),
);

// ------------------------------------------------------------------ Davetler
router.get(
  "/invites",
  route(async (request, response) => {
    await requireAdmin(request);
    const store = await getStore();
    const items = await store.find("Invite", {}, "-created_date", 300);

    response.json({
      items: items.map((invite) => ({ ...invite, ...inviteState(invite) })),
    });
  }),
);

const InviteBody = z.object({
  note: z.string().trim().max(120).optional().default(""),
  max_uses: z.number().int().min(0).max(1000).optional().default(1),
  days: z.number().int().min(0).max(3650).optional().default(7),
});

router.post(
  "/invites",
  route(async (request, response) => {
    await requireAdmin(request);
    const body = parseBody(InviteBody, request.body);
    const invite = await createInvite(body);
    response.json({ ok: true, invite: { ...invite, ...inviteState(invite) } });
  }),
);

router.patch(
  "/invites/:id",
  route(async (request, response) => {
    await requireAdmin(request);
    const body = parseBody(z.object({ active: z.boolean() }), request.body);
    const store = await getStore();
    const invite = await store.get("Invite", request.params.id);
    if (!invite) throw new HttpError(404, "Davet bulunamadı");

    const updated = await store.update("Invite", invite.id, { active: body.active, updated_date: nowIso() });
    response.json({ ok: true, invite: { ...updated, ...inviteState(updated) } });
  }),
);

router.delete(
  "/invites/:id",
  route(async (request, response) => {
    await requireAdmin(request);
    const store = await getStore();
    const invite = await store.get("Invite", request.params.id);
    if (!invite) throw new HttpError(404, "Davet bulunamadı");

    await store.delete("Invite", invite.id);
    response.json({ ok: true });
  }),
);

// ------------------------------------------------------------------ Şikayetler
router.get(
  "/reports",
  route(async (request, response) => {
    await requireAdmin(request);
    const store = await getStore();
    response.json({ items: await store.find("Report", {}, "-created_date", 300) });
  }),
);

const ReportStatusBody = z.object({ status: z.enum(["open", "resolved", "dismissed"]) });

router.patch(
  "/reports/:id",
  route(async (request, response) => {
    await requireAdmin(request);
    const body = parseBody(ReportStatusBody, request.body);
    const store = await getStore();
    const report = await store.get("Report", request.params.id);
    if (!report) throw new HttpError(404, "Şikayet bulunamadı");

    const updated = await store.update("Report", report.id, { status: body.status, updated_date: nowIso() });
    response.json(updated);
  }),
);

// ------------------------------------------------------------------ Ayarlar
const SettingsBody = z.object({
  site_name: z.string().trim().min(1).max(60).optional(),
  motd: z.string().max(300).optional(),
  allow_registration: z.boolean().optional(),
  allow_communities: z.boolean().optional(),
  allow_channels: z.boolean().optional(),
  require_email_verification: z.boolean().optional(),
  // "" = .env değeri kullanılsın (sunucu varsayılanı).
  registration_method: z.union([z.enum(REGISTRATION_METHODS), z.literal("")]).optional(),
  captcha_provider: z.union([z.enum(CAPTCHA_PROVIDERS), z.literal("")]).optional(),
});

router.get(
  "/settings",
  route(async (request, response) => {
    await requireAdmin(request);
    response.json(await getSettings());
  }),
);

router.put(
  "/settings",
  route(async (request, response) => {
    await requireAdmin(request);
    const body = parseBody(SettingsBody, request.body);
    response.json(await saveSettings(body));
  }),
);

// ------------------------------------------------------------------ Veritabanı
router.get(
  "/export",
  route(async (request, response) => {
    await requireAdmin(request);
    const store = await getStore();

    const payload = {
      app: "krypt",
      format: 1,
      exported_at: nowIso(),
      collections: {},
    };

    for (const name of ADMIN_COLLECTIONS) {
      payload.collections[name] = await store.all(name);
    }

    const stamp = payload.exported_at.slice(0, 19).replaceAll(":", "-");
    response.setHeader("Content-Type", "application/json; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="krypt-db-${stamp}.json"`);
    response.send(JSON.stringify(payload, null, 2));
  }),
);

const ImportBody = z.object({
  mode: z.enum(["merge", "replace"]).optional().default("merge"),
  data: z.record(z.string(), z.any()),
});

router.post(
  "/import",
  route(async (request, response) => {
    await requireAdmin(request);
    const body = parseBody(ImportBody, request.body);
    const collections = body.data?.collections ?? body.data;

    if (!collections || typeof collections !== "object" || Array.isArray(collections)) {
      throw new HttpError(400, "Geçersiz yedek dosyası: 'collections' nesnesi gerekli");
    }

    const names = Object.keys(collections).filter((name) => ADMIN_COLLECTIONS.includes(name));
    if (!names.length) throw new HttpError(400, "Yedek dosyasında tanınan bir koleksiyon yok");

    for (const name of names) {
      if (!Array.isArray(collections[name])) throw new HttpError(400, `'${name}' bir dizi olmalı`);
    }

    if (body.mode === "replace" && Array.isArray(collections.users)) {
      const hasAdmin = collections.users.some((user) => user?.role === "admin");
      if (!hasAdmin) throw new HttpError(400, "Yedekte yönetici hesabı yok; tüm veriyi değiştirmek güvenli değil");
    }

    const store = await getStore();
    let imported = 0;

    for (const name of names) {
      if (body.mode === "replace") {
        for (const existing of await store.all(name)) await store.delete(name, existing.id);
      }

      for (const doc of collections[name]) {
        if (!doc || typeof doc !== "object" || Array.isArray(doc) || !doc.id) continue;
        const existing = await store.get(name, doc.id);
        if (existing) await store.update(name, doc.id, doc);
        else await store.create(name, doc);
        imported += 1;
      }
    }

    resetSettingsCache();
    response.json({ ok: true, mode: body.mode, imported, collections: names });
  }),
);

export default router;
