// Uçtan uca API testi: sunucuyu geçici bir SQLite dosyasıyla başlatır.
// Çalıştır: npm test
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

import { WebSocket } from "ws";

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = 19000 + Math.floor(Math.random() * 2000);
const BASE = `http://127.0.0.1:${PORT}`;
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "krypt-"));
const TMP_DB = path.join(TMP_DIR, "test.db");
// Yönetici, admin.json dosyasındaki hesap. Testte geçici bir dosya kullanılır.
const TEST_ADMIN_FILE = path.join(TMP_DIR, "admin.json");
fs.writeFileSync(TEST_ADMIN_FILE, JSON.stringify({ email: "root@x.com", password: "rootparola1" }));

let child;
let output = "";
let tokens = {};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function call(pathname, { method = "GET", body, token } = {}) {
  const response = await fetch(BASE + pathname, {
    method,
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  return { status: response.status, data };
}

function nextJson(ws, timeout = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("WebSocket zaman aşımı")), timeout);
    const onMessage = (data) => {
      clearTimeout(timer);
      ws.off("message", onMessage);
      resolve(JSON.parse(data.toString()));
    };
    ws.on("message", onMessage);
  });
}

async function register(email) {
  const response = await call("/api/auth/register", {
    method: "POST",
    body: { email, password: "parola123" },
  });
  assert.equal(response.status, 200, JSON.stringify(response.data));
  return { token: response.data.access_token, user: response.data.user };
}

before(async () => {
  child = spawn(process.execPath, [path.join(SERVER_DIR, "index.js")], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: "127.0.0.1",
      DB_BACKEND: "sqlite",
      DATABASE_URL: `sqlite:///${TMP_DB}`,
      JWT_SECRET: "test-secret",
      ALLOW_REGISTRATION: "true",
      // Doğrulama testi panelden açılır; varsayılan akışı bozmasın diye kapalı başlar.
      REQUIRE_EMAIL_VERIFICATION: "true",
      // Testler aynı IP'den çok kayıt dener; sınırı yükselt (üretimde varsayılan 10).
      REGISTER_RATE_LIMIT: "200",
      ADMIN_FILE: TEST_ADMIN_FILE,
      SMTP_HOST: "",
      FRONTEND_DIR: path.join(path.dirname(TMP_DB), "no-frontend"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (child.exitCode !== null) throw new Error(`Sunucu kapandı:\n${output}`);
    try {
      const response = await fetch(`${BASE}/api/health`);
      if (response.ok) return;
    } catch {
      /* henüz dinlemiyor */
    }
    await sleep(150);
  }

  throw new Error(`Sunucu açılmadı:\n${output}`);
});

after(async () => {
  child?.kill("SIGTERM");
  await sleep(200);
  fs.rmSync(path.dirname(TMP_DB), { recursive: true, force: true });
});

test("hazırlık: e-posta doğrulaması kapatılır", async () => {
  const login = await call("/api/auth/login", {
    method: "POST",
    body: { email: "root@x.com", password: "rootparola1" },
  });
  assert.equal(login.status, 200, JSON.stringify(login.data));

  const saved = await call("/api/admin/settings", {
    method: "PUT",
    token: login.data.access_token,
    body: { require_email_verification: false },
  });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.require_email_verification, false);
});

test("sağlık ucu arka ucu bildirir", async () => {
  const response = await call("/api/health");
  assert.equal(response.status, 200);
  assert.equal(response.data.ok, true);
  assert.equal(response.data.backend, "sqlite");
});

test("kayıt, rol ve giriş", async () => {
  const a = await register("a@x.com");
  const b = await register("b@x.com");

  // İlk kayıt olan yönetici DEĞİLDİR; yönetici admin.json dosyasından gelir.
  assert.equal(a.user.role, "user");
  assert.equal(b.user.role, "user");

  const rootLogin = await call("/api/auth/login", {
    method: "POST",
    body: { email: "root@x.com", password: "rootparola1" },
  });
  assert.equal(rootLogin.status, 200);
  assert.equal(rootLogin.data.user.role, "admin");

  tokens = { a: a.token, b: b.token, root: rootLogin.data.access_token };

  const wrong = await call("/api/auth/login", {
    method: "POST",
    body: { email: "a@x.com", password: "yanlis" },
  });
  assert.equal(wrong.status, 401);

  assert.equal((await call("/api/auth/me")).status, 401);
  assert.equal((await call("/api/auth/me", { token: tokens.a })).data.email, "a@x.com");

  const short = await call("/api/auth/register", {
    method: "POST",
    body: { email: "c@x.com", password: "kisa" },
  });
  assert.equal(short.status, 400);
});

test("admin paneli: erişim, roller, ayarlar, yedek", async () => {
  assert.equal((await call("/api/admin/users", { token: tokens.a })).status, 403);
  assert.equal((await call("/api/admin/export", { token: tokens.a })).status, 403);

  const list = await call("/api/admin/users", { token: tokens.root });
  assert.equal(list.status, 200);
  const rootRow = list.data.items.find((row) => row.email === "root@x.com");
  assert.equal(rootRow.role, "admin");
  assert.equal(rootRow.is_file_admin, true);

  const bRow = list.data.items.find((row) => row.email === "b@x.com");
  assert.equal(
    (
      await call(`/api/admin/users/${bRow.id}/role`, {
        method: "PATCH",
        body: { role: "admin" },
        token: tokens.root,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call(`/api/admin/users/${bRow.id}/role`, {
        method: "PATCH",
        body: { role: "user" },
        token: tokens.root,
      })
    ).status,
    200,
  );

  const exported = await call("/api/admin/export", { token: tokens.root });
  assert.equal(exported.status, 200);
  assert.ok(exported.data.collections.users.length >= 3);

  const imported = await call("/api/admin/import", {
    method: "POST",
    token: tokens.root,
    body: { mode: "merge", data: exported.data },
  });
  assert.equal(imported.status, 200);
  assert.ok(imported.data.imported > 0);

  assert.equal(
    (
      await call("/api/admin/settings", {
        method: "PUT",
        token: tokens.root,
        body: { allow_registration: false, allow_channels: false },
      })
    ).status,
    200,
  );

  assert.equal(
    (await call("/api/auth/register", { method: "POST", body: { email: "d@x.com", password: "parola123" } }))
      .status,
    403,
  );
  assert.equal(
    (
      await call("/api/entities/Channel", {
        method: "POST",
        token: tokens.a,
        body: { name: "yeni", slug: "yeni", visibility: "public", kind: "custom", members: [] },
      })
    ).status,
    403,
  );

  await call("/api/admin/settings", {
    method: "PUT",
    token: tokens.root,
    body: { allow_registration: true, allow_channels: true },
  });
  assert.equal(
    (await call("/api/auth/register", { method: "POST", body: { email: "d@x.com", password: "parola123" } }))
      .status,
    200,
  );
});

test("profil: handle benzersiz", async () => {
  const a = await call("/api/auth/me", { token: tokens.a });
  const b = await call("/api/auth/me", { token: tokens.b });

  const profile = { user_id: a.data.id, handle: "ali", public_key: "k" };
  assert.equal(
    (await call("/api/entities/Profile", { method: "POST", body: profile, token: tokens.a })).status,
    200,
  );
  assert.equal(
    (
      await call("/api/entities/Profile", {
        method: "POST",
        body: { ...profile, user_id: b.data.id },
        token: tokens.b,
      })
    ).status,
    409,
  );
});

test("özel kanal erişim kuralları", async () => {
  const a = await call("/api/auth/me", { token: tokens.a });
  const b = await call("/api/auth/me", { token: tokens.b });

  const created = await call("/api/entities/Channel", {
    method: "POST",
    token: tokens.a,
    body: {
      name: "gizli",
      slug: "gizli",
      visibility: "private",
      kind: "custom",
      members: [a.data.id],
    },
  });
  assert.equal(created.status, 200);
  const channel = created.data;
  tokens.channel = channel.id;

  const query = { $or: [{ visibility: "public" }, { members: a.data.id }] };
  const asA = await call("/api/entities/Channel/query", { method: "POST", body: { query }, token: tokens.a });
  const asB = await call("/api/entities/Channel/query", { method: "POST", body: { query }, token: tokens.b });
  assert.equal(asA.data.items.length, 1);
  assert.equal(asB.data.items.length, 0);

  assert.equal((await call(`/api/entities/Channel/${channel.id}`, { token: tokens.b })).status, 404);
  assert.equal(
    (await call(`/api/entities/Channel/${channel.id}`, { method: "PATCH", body: { name: "x" }, token: tokens.b })).status,
    404,
  );

  assert.equal(
    (
      await call(`/api/entities/Channel/${channel.id}`, {
        method: "PATCH",
        body: { members: [a.data.id, b.data.id] },
        token: tokens.a,
      })
    ).status,
    200,
  );

  assert.equal(
    (
      await call(`/api/entities/Channel/${channel.id}`, {
        method: "PATCH",
        body: { description: "d" },
        token: tokens.b,
      })
    ).status,
    200,
  );
  assert.equal((await call(`/api/entities/Channel/${channel.id}`, { method: "DELETE", token: tokens.b })).status, 403);
});

test("kasa yalnızca sahibinde", async () => {
  const a = await call("/api/auth/me", { token: tokens.a });
  const created = await call("/api/entities/Vault", {
    method: "POST",
    token: tokens.a,
    body: { user_id: a.data.id, vault_blob: "z" },
  });
  assert.equal(created.status, 200);

  const asB = await call("/api/entities/Vault/query", {
    method: "POST",
    token: tokens.b,
    body: { query: { user_id: a.data.id } },
  });
  assert.deepEqual(asB.data.items, []);
});

test("bildirim dağıtımı ve yetkiler", async () => {
  const a = await call("/api/auth/me", { token: tokens.a });

  assert.equal(
    (
      await call("/api/entities/Notification", {
        method: "POST",
        token: tokens.b,
        body: { user_id: a.data.id, type: "dm", title: "t" },
      })
    ).status,
    403,
  );

  const notified = await call("/api/notify", {
    method: "POST",
    token: tokens.b,
    body: { channelId: tokens.channel, type: "message", title: "yeni" },
  });
  assert.equal(notified.data.notified, 1);

  const unreadA = await call("/api/entities/Notification/count", {
    method: "POST",
    token: tokens.a,
    body: { query: { user_id: a.data.id, read: false } },
  });
  assert.equal(unreadA.data.count, 1);

  const forB = await call("/api/entities/Notification/count", {
    method: "POST",
    token: tokens.b,
    body: { query: {} },
  });
  assert.equal(forB.data.count, 0);

  const marked = await call("/api/entities/Notification/update-many", {
    method: "POST",
    token: tokens.a,
    body: { query: { user_id: a.data.id, read: false }, set: { read: true } },
  });
  assert.equal(marked.data.updated, 1);
});

test("mesaj: created_by_id sunucudan gelir, enjeksiyon kapalı", async () => {
  const a = await call("/api/auth/me", { token: tokens.a });
  const created = await call("/api/entities/Message", {
    method: "POST",
    token: tokens.a,
    body: { channel_id: tokens.channel, cipher: "abc", created_by_id: "baska" },
  });
  assert.equal(created.status, 200);
  assert.equal(created.data.created_by_id, a.data.id);

  const injected = await call("/api/entities/Message/query", {
    method: "POST",
    token: tokens.a,
    body: { query: { $where: "1" } },
  });
  assert.equal(injected.status, 400);

  const unknown = await call("/api/entities/Yok/query", { method: "POST", token: tokens.a, body: {} });
  assert.equal(unknown.status, 404);
});

test("WebSocket yalnızca yetkili olayları yayınlar", async () => {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/api/ws`);
  await new Promise((resolve, reject) => {
    ws.once("open", resolve);
    ws.once("error", reject);
  });

  ws.send(JSON.stringify({ type: "auth", token: tokens.a }));
  const ready = await nextJson(ws);
  assert.equal(ready.type, "ready");

  const event = nextJson(ws);
  await call("/api/entities/Message", {
    method: "POST",
    token: tokens.b,
    body: { channel_id: tokens.channel, cipher: "gercek-zamanli" },
  });

  const received = await event;
  assert.equal(received.entity, "Message");
  assert.equal(received.data.cipher, "gercek-zamanli");

  ws.close();
});

test("e-posta doğrulaması: kayıt, engel ve doğrulama bağlantısı", async () => {
  await call("/api/admin/settings", {
    method: "PUT",
    token: tokens.root,
    body: { require_email_verification: true, allow_registration: true },
  });

  const registered = await call("/api/auth/register", {
    method: "POST",
    body: { email: "verify@x.com", password: "parola123" },
  });
  assert.equal(registered.status, 200);
  assert.equal(registered.data.verification_required, true);
  assert.equal(registered.data.access_token, undefined);
  // SMTP yok: istemciye "posta gönderilemedi" bilgisi dönmeli.
  assert.equal(registered.data.mail_sent, false);

  const mail = await call("/api/admin/mail", { token: tokens.root });
  assert.equal(mail.status, 200);
  assert.equal(mail.data.smtp_configured, false);
  assert.equal(mail.data.recent[0].delivered, false);

  const blocked = await call("/api/auth/login", {
    method: "POST",
    body: { email: "verify@x.com", password: "parola123" },
  });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.data.code, "email_unverified");

  let verifyToken = null;
  for (let attempt = 0; attempt < 40 && !verifyToken; attempt += 1) {
    verifyToken = [...output.matchAll(/verify-email\?token=([\w.-]+)/g)].pop()?.[1] ?? null;
    if (!verifyToken) await sleep(100);
  }
  assert.ok(verifyToken, `Doğrulama bağlantısı konsola yazılmadı:\n${output}`);

  // Panelden elle iletilecek bağlantı (posta göndermez).
  const pendingId = (await call("/api/admin/users", { token: tokens.root })).data.items.find(
    (row) => row.email === "verify@x.com",
  ).id;
  const manual = await call(`/api/admin/users/${pendingId}/verification-link`, {
    method: "POST",
    token: tokens.root,
  });
  assert.equal(manual.status, 200);
  assert.match(manual.data.link, /\/verify-email\?token=/);

  const verified = await call("/api/auth/verify-email", {
    method: "POST",
    body: { token: verifyToken },
  });
  assert.equal(verified.status, 200);
  assert.equal(verified.data.user.email_verified, true);

  const login = await call("/api/auth/login", {
    method: "POST",
    body: { email: "verify@x.com", password: "parola123" },
  });
  assert.equal(login.status, 200);

  await call("/api/admin/settings", {
    method: "PUT",
    token: tokens.root,
    body: { require_email_verification: false },
  });
});

test("moderasyon: ban girişi, susturma yazmayı engeller", async () => {
  const mod = await register("mod@x.com");

  const ban = await call(`/api/admin/users/${mod.user.id}/moderation`, {
    method: "PATCH",
    token: tokens.root,
    body: { action: "ban", hours: 24, reason: "spam" },
  });
  assert.equal(ban.status, 200);
  assert.equal(ban.data.user.banned, true);

  assert.equal((await call("/api/auth/me", { token: mod.token })).status, 403);
  assert.equal(
    (await call("/api/auth/login", { method: "POST", body: { email: "mod@x.com", password: "parola123" } }))
      .status,
    403,
  );

  assert.equal(
    (
      await call(`/api/admin/users/${mod.user.id}/moderation`, {
        method: "PATCH",
        token: tokens.root,
        body: { action: "unban" },
      })
    ).status,
    200,
  );

  assert.equal(
    (
      await call(`/api/admin/users/${mod.user.id}/moderation`, {
        method: "PATCH",
        token: tokens.root,
        body: { action: "mute", reason: "tartışma" },
      })
    ).status,
    200,
  );

  const mutedPost = await call("/api/entities/Message", {
    method: "POST",
    token: mod.token,
    body: { channel_id: tokens.channel, cipher: "susturulmus" },
  });
  assert.equal(mutedPost.status, 403);

  assert.equal(
    (
      await call(`/api/admin/users/${mod.user.id}/moderation`, {
        method: "PATCH",
        token: tokens.root,
        body: { action: "unmute" },
      })
    ).status,
    200,
  );

  assert.equal(
    (
      await call("/api/entities/Message", {
        method: "POST",
        token: mod.token,
        body: { channel_id: tokens.channel, cipher: "susturma-kalkti" },
      })
    ).status,
    200,
  );
});

test("şikayet: kullanıcı bildirir, yönetici listeler ve kapatır", async () => {
  const created = await call("/api/entities/Report", {
    method: "POST",
    token: tokens.b,
    body: { target_type: "message", target_id: "msg1", target_handle: "ali", reason: "spam mesaj" },
  });
  assert.equal(created.status, 200);
  assert.equal(created.data.status, "open");

  assert.equal((await call("/api/admin/reports", { token: tokens.b })).status, 403);

  const list = await call("/api/admin/reports", { token: tokens.root });
  assert.equal(list.status, 200);
  const row = list.data.items.find((item) => item.id === created.data.id);
  assert.ok(row);
  assert.equal(row.reason, "spam mesaj");

  const closed = await call(`/api/admin/reports/${row.id}`, {
    method: "PATCH",
    token: tokens.root,
    body: { status: "resolved" },
  });
  assert.equal(closed.status, 200);
  assert.equal(closed.data.status, "resolved");
});

test("parola sıfırlama tek kullanımlık", async () => {
  assert.equal(
    (await call("/api/auth/forgot", { method: "POST", body: { email: "b@x.com" } })).status,
    200,
  );

  let resetToken = null;
  for (let attempt = 0; attempt < 40 && !resetToken; attempt += 1) {
    resetToken = output.match(/reset-password\?token=([\w.-]+)/)?.[1] ?? null;
    if (!resetToken) await sleep(100);
  }
  assert.ok(resetToken, `Sıfırlama bağlantısı konsola yazılmadı:\n${output}`);

  const first = await call("/api/auth/reset", {
    method: "POST",
    body: { token: resetToken, new_password: "yeniparola1" },
  });
  assert.equal(first.status, 200);

  const second = await call("/api/auth/reset", {
    method: "POST",
    body: { token: resetToken, new_password: "baska12345" },
  });
  assert.equal(second.status, 400);

  const login = await call("/api/auth/login", {
    method: "POST",
    body: { email: "b@x.com", password: "yeniparola1" },
  });
  assert.equal(login.status, 200);
});

test("davet kodu: panelden üret, kullanım/süre sınırı, kayıtta tüket", async () => {
  const setSettings = (patch) =>
    call("/api/admin/settings", { method: "PUT", token: tokens.root, body: patch });

  assert.equal((await setSettings({ registration_method: "invite" })).status, 200);
  assert.equal((await call("/api/settings")).data.registration_method, "invite");

  const made = await call("/api/admin/invites", {
    method: "POST",
    token: tokens.root,
    body: { note: "davet testi", max_uses: 1, days: 1 },
  });
  assert.equal(made.status, 200, JSON.stringify(made.data));
  const code = made.data.invite.code;
  assert.match(code, /^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  assert.ok(made.data.invite.expires_at, "süreli davetin bitiş tarihi olmalı");

  const noCode = await call("/api/auth/register", {
    method: "POST",
    body: { username: "davetsiz", password: "parola123" },
  });
  assert.equal(noCode.status, 400);
  assert.equal(noCode.data.code, "invite_required");

  const ok = await call("/api/auth/register", {
    method: "POST",
    body: { username: "davetli", password: "parola123", invite_code: code.toLowerCase() },
  });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.ok(ok.data.access_token);
  assert.equal(ok.data.user.username, "davetli");
  assert.equal(ok.data.user.email, null);

  const again = await call("/api/auth/register", {
    method: "POST",
    body: { username: "davetli2", password: "parola123", invite_code: code },
  });
  assert.equal(again.status, 400);
  assert.equal(again.data.code, "invite_exhausted");

  const list = await call("/api/admin/invites", { token: tokens.root });
  const row = list.data.items.find((item) => item.code === code);
  assert.equal(row.used_count, 1);
  assert.equal(row.valid, false);

  const login = await call("/api/auth/login", {
    method: "POST",
    body: { login: "davetli", password: "parola123" },
  });
  assert.equal(login.status, 200, JSON.stringify(login.data));
  assert.equal(login.data.user.username, "davetli");

  // Süresi geçmiş kod reddedilir (yönetici yedeğiyle geçmiş tarihli davet eklenir).
  const stamp = new Date().toISOString();
  const expired = {
    id: "inv-expired",
    code: "ZZZZ-9999",
    note: "",
    max_uses: 5,
    used_count: 0,
    expires_at: new Date(Date.now() - 86_400_000).toISOString(),
    active: true,
    created_date: stamp,
    updated_date: stamp,
  };
  assert.equal(
    (
      await call("/api/admin/import", {
        method: "POST",
        token: tokens.root,
        body: { mode: "merge", data: { collections: { Invite: [expired] } } },
      })
    ).status,
    200,
  );

  const expiredAttempt = await call("/api/auth/register", {
    method: "POST",
    body: { username: "eskikod", password: "parola123", invite_code: "zzzz-9999" },
  });
  assert.equal(expiredAttempt.status, 400);
  assert.equal(expiredAttempt.data.code, "invite_expired");

  await setSettings({ registration_method: "email" });
});

test("kendi captcha'mız: rastgele yazıyı kutuya yazma", async () => {
  const setSettings = (patch) =>
    call("/api/admin/settings", { method: "PUT", token: tokens.root, body: patch });

  assert.equal((await setSettings({ registration_method: "captcha", captcha_provider: "local" })).status, 200);

  const first = await call("/api/captcha");
  assert.equal(first.data.provider, "local");
  assert.match(first.data.challenge.text, /^[a-zçğıöşü]+ [a-zçğıöşü]+ \d{1,2}$/);
  assert.ok(first.data.challenge.id);

  const wrong = await call("/api/auth/register", {
    method: "POST",
    body: {
      username: "captcha-yanlis",
      password: "parola123",
      captcha_id: first.data.challenge.id,
      captcha_answer: "yanlis cevap",
    },
  });
  assert.equal(wrong.status, 400);
  assert.equal(wrong.data.code, "captcha_failed");

  // Yanlış cevap kimliği yakar; yeni yazı istenir.
  const reused = await call("/api/auth/register", {
    method: "POST",
    body: {
      username: "captcha-tekrar",
      password: "parola123",
      captcha_id: first.data.challenge.id,
      captcha_answer: first.data.challenge.text,
    },
  });
  assert.equal(reused.status, 400);
  assert.equal(reused.data.code, "captcha_expired");

  const second = await call("/api/captcha");
  const ok = await call("/api/auth/register", {
    method: "POST",
    body: {
      username: "captcha-uyesi",
      password: "parola123",
      captcha_id: second.data.challenge.id,
      captcha_answer: second.data.challenge.text,
    },
  });
  assert.equal(ok.status, 200, JSON.stringify(ok.data));
  assert.equal(ok.data.user.username, "captcha-uyesi");

  await setSettings({ registration_method: "email", captcha_provider: "none" });
});

test("telegram: bot ayarlı değilken açıklayıcı hata", async () => {
  assert.equal(
    (
      await call("/api/admin/settings", {
        method: "PUT",
        token: tokens.root,
        body: { registration_method: "telegram" },
      })
    ).status,
    200,
  );

  const res = await call("/api/auth/register", {
    method: "POST",
    body: { username: "telegram-uyesi", password: "parola123" },
  });
  assert.equal(res.status, 503);
  assert.equal(res.data.code, "telegram_unconfigured");

  await call("/api/admin/settings", {
    method: "PUT",
    token: tokens.root,
    body: { registration_method: "email" },
  });
});

test("turnstile anahtarları eksikse kayıt kapanır (fail-closed)", async () => {
  assert.equal(
    (
      await call("/api/admin/settings", {
        method: "PUT",
        token: tokens.root,
        body: { registration_method: "email", captcha_provider: "turnstile" },
      })
    ).status,
    200,
  );

  const publicSettings = await call("/api/settings");
  assert.equal(publicSettings.data.captcha_provider, "turnstile");
  assert.equal(publicSettings.data.captcha_ready, false);

  const captcha = await call("/api/captcha");
  assert.equal(captcha.data.provider, "turnstile");
  assert.equal(captcha.data.ready, false);

  // Anahtar yokken sessizce kapanmaz: kayıt 503 ile reddedilir.
  const blocked = await call("/api/auth/register", {
    method: "POST",
    body: { email: "turnstile-yok@x.com", password: "parola123" },
  });
  assert.equal(blocked.status, 503);
  assert.equal(blocked.data.code, "captcha_unconfigured");

  await call("/api/admin/settings", {
    method: "PUT",
    token: tokens.root,
    body: { captcha_provider: "none" },
  });
});

test("telegram: bot ayarsızken yeni kod isteği açıklayıcı hata verir", async () => {
  await call("/api/admin/settings", {
    method: "PUT",
    token: tokens.root,
    body: { registration_method: "telegram" },
  });

  const res = await call("/api/auth/telegram/resend", {
    method: "POST",
    body: { username: "herhangi", password: "parola123" },
  });
  assert.equal(res.status, 503);
  assert.equal(res.data.code, "telegram_unconfigured");

  await call("/api/admin/settings", {
    method: "PUT",
    token: tokens.root,
    body: { registration_method: "email" },
  });
});
