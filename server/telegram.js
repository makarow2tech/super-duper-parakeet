// Telegram ile doğrulama.
//
// Kayıt yöntemi "telegram" iken kullanıcı yalnızca kullanıcı adı + parola verir.
// Sunucu kısa ömürlü bir kod üretir; kullanıcı bottan `/start <kod>` yazar.
// Bot, kodu doğrulayınca hesap doğrulanır ve istemci kodu sorgulayarak oturum alır.
//
// Bot iki şekilde çalışır: uzun yoklama (getUpdates, varsayılan) veya
// /api/telegram/webhook ucu. TELEGRAM_BOT_TOKEN yoksa hiçbir istek yapılmaz.
import crypto from "node:crypto";

import { TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME } from "./config.js";
import { getStore, nowIso } from "./store.js";

const TTL_MS = 30 * 60 * 1000;
const pending = new Map();
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function telegramEnabled() {
  return Boolean(TELEGRAM_BOT_TOKEN && TELEGRAM_BOT_USERNAME);
}

function prune() {
  const now = Date.now();
  for (const [code, entry] of pending) {
    if (entry.status !== "verified" && entry.created + TTL_MS <= now) {
      entry.status = "expired";
    }
    if (entry.created + TTL_MS * 4 <= now) pending.delete(code);
  }
}

function newCode() {
  let code;
  do {
    code = Array.from({ length: 8 }, () => CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]).join("");
  } while (pending.has(code));
  return code;
}

/**
 * Kayıt sonrası istemciye verilecek kod + bot bağlantısı.
 * Aynı hesap için önceki bekleyen kodlar geçersiz kılınır (tek aktif kod).
 */
export function createTelegramVerification(user) {
  prune();

  for (const [oldCode, entry] of pending) {
    if (entry.userId === user.id && entry.status === "pending") {
      entry.status = "expired";
      pending.set(oldCode, entry);
    }
  }

  const code = newCode();
  pending.set(code, { userId: user.id, status: "pending", created: Date.now(), chat_id: null });

  return {
    code,
    bot_username: TELEGRAM_BOT_USERNAME,
    bot_url: `https://t.me/${TELEGRAM_BOT_USERNAME}?start=${code}`,
    expires_in: Math.round(TTL_MS / 1000),
  };
}

/** İstemcinin yokladığı durum: pending | verified | expired | unknown. */
export function telegramStatus(code) {
  prune();
  const entry = pending.get(String(code || "").trim().toUpperCase());
  if (!entry) return { status: "unknown", userId: null };
  return { status: entry.status, userId: entry.userId };
}

async function api(method, payload = {}, timeoutMs = 35_000) {
  const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.description || `Telegram HTTP ${response.status}`);
  }
  return data;
}

export function sendTelegramMessage(chatId, text) {
  if (!TELEGRAM_BOT_TOKEN) return Promise.resolve();
  return api("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true }).catch((error) =>
    console.warn(`[telegram] mesaj gönderilemedi: ${error.message}`),
  );
}

/** Kodu işler; hesabı doğrular. Sonuç: verified | already | not_found | expired */
async function verifyCode(rawCode, chatId, username) {
  const code = String(rawCode || "").trim().toUpperCase();
  const entry = pending.get(code);
  if (!entry) return "not_found";

  if (entry.created + TTL_MS <= Date.now()) {
    entry.status = "expired";
    return "expired";
  }
  if (entry.status === "verified") return "already";

  const store = await getStore();
  const user = await store.get("users", entry.userId);
  if (!user) return "not_found";

  await store.update("users", user.id, {
    email_verified: true,
    telegram_chat_id: String(chatId),
    telegram_username: username || null,
    updated_date: nowIso(),
  });

  entry.status = "verified";
  entry.chat_id = String(chatId);
  entry.verified_at = nowIso();
  return "verified";
}

/** Bir Telegram güncellemesini işler (yoklama ve webhook ortak kullanır). */
export async function handleTelegramUpdate(update) {
  const message = update?.message ?? update?.edited_message;
  if (!message) return;

  const text = String(message.text || "").trim();
  const chatId = message.chat?.id;
  if (!chatId) return;

  const match = text.match(/^\/(?:start|dogrula|doğrula)(?:@\w+)?(?:\s+(\S+))?$/i);
  const typedCode = match ? match[1] : text.split(/\s+/)[0];
  const result = match?.[1] || /^[A-Z0-9]{6,12}$/i.test(typedCode) ? typedCode : "";

  if (!result) {
    await sendTelegramMessage(
      chatId,
      `Merhaba${message.from?.username ? ` @${message.from.username}` : ""}! KRYPT hesabını doğrulamak için kayıt ekranındaki kodu şöyle yaz:\n/start KODUN`,
    );
    return;
  }

  const outcome = await verifyCode(result, chatId, message.from?.username || "");

  const replies = {
    verified: "Hesabın doğrulandı. Tarayıcıya dön; oturum birkaç saniye içinde açılacak.",
    already: "Bu kod zaten kullanıldı. Tarayıcıya dön; oturumun açılmış olmalı.",
    expired: "Kodun süresi dolmuş. Sitedeki kayıt ekranından yeni bir kod al.",
    not_found: "Kodu bulamadım. Sitedeki kayıt ekranındaki kodu aynen yaz: /start KODUN",
  };

  await sendTelegramMessage(chatId, replies[outcome] || replies.not_found);
}

/** Webhook gövdesini işler (index.js çağırır). */
export async function handleWebhookUpdate(body) {
  await handleTelegramUpdate(body);
}

// ---------------------------------------------------------------- Uzun yoklama
let polling = false;
let offset = 0;

/** Bot tokeni varsa güncellemeleri dinler. Webhook kullanacaksan çağırma. */
export async function startTelegramPolling() {
  if (!telegramEnabled() || polling) return;
  polling = true;
  console.log(`[telegram] bot dinleniyor: @${TELEGRAM_BOT_USERNAME}`);

  const loop = async () => {
    while (polling) {
      try {
        const data = await api("getUpdates", { offset, timeout: 25, allowed_updates: ["message"] }, 35_000);
        for (const update of data.result || []) {
          offset = Math.max(offset, Number(update.update_id || 0) + 1);
          await handleTelegramUpdate(update).catch((error) =>
            console.warn(`[telegram] güncelleme işlenemedi: ${error.message}`),
          );
        }
      } catch (error) {
        if (!polling) return;
        console.warn(`[telegram] yoklama hatası: ${error.message}`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  };

  loop();
}

export function stopTelegramPolling() {
  polling = false;
}
