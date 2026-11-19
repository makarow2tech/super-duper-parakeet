// Kayıt formu için insan doğrulaması.
//
// local     → kendi captcha'mız: rastgele bir yazı üretilir, kullanıcıdan onu
//             kutucuğa aynen yazması istenir (tek kullanımlık, 5 dakika geçerli).
// turnstile → Cloudflare Turnstile widget'ı sunucuda doğrulanır.
//
// CAPTCHA_PROVIDER=none ise hiçbir şey istenmez.
import crypto from "node:crypto";

import { CAPTCHA_PROVIDER, TURNSTILE_SECRET_KEY, TURNSTILE_SITE_KEY } from "./config.js";
import { HttpError } from "./http.js";

const WORDS = [
  "ada", "ayna", "bulut", "deniz", "duman", "gece", "güneş", "kaya", "kartal", "kırmızı",
  "koru", "kuzey", "liman", "mavi", "nehir", "orman", "pusula", "rüzgar", "sessiz", "sis",
  "taş", "toprak", "uçurtma", "vadi", "yalnız", "yaprak", "yıldız", "yol", "zeytin", "çınar",
];

const TTL_MS = 5 * 60 * 1000;
const MAX_ENTRIES = 5000;
const challenges = new Map();

const pick = (list) => list[crypto.randomInt(list.length)];

function prune() {
  const now = Date.now();
  for (const [id, entry] of challenges) {
    if (entry.expires <= now) challenges.delete(id);
  }
  // Bellek sınırı: en eski kayıtları at.
  while (challenges.size > MAX_ENTRIES) {
    challenges.delete(challenges.keys().next().value);
  }
}

function sameText(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function normalizeAnswer(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Rastgele yazı + tek kullanımlık kimlik üretir. */
export function createLocalChallenge() {
  prune();

  const text = `${pick(WORDS)} ${pick(WORDS)} ${crypto.randomInt(10, 100)}`;
  const id = crypto.randomBytes(18).toString("base64url");

  challenges.set(id, { answer: text, expires: Date.now() + TTL_MS, used: false });

  return {
    id,
    text,
    instruction: "Aşağıdaki yazıyı kutucuğa aynen yaz:",
    expires_in: Math.round(TTL_MS / 1000),
  };
}

/** Yerel captcha yanıtını doğrular; her kimlik yalnızca bir kez kullanılabilir. */
export function checkLocalChallenge(id, answer) {
  prune();
  const entry = challenges.get(String(id || ""));

  if (!entry || entry.used || entry.expires <= Date.now()) {
    throw new HttpError(400, "Güvenlik doğrulamasının süresi doldu, yeni yazı isteyin", "captcha_expired");
  }

  // Tek kullanımlık: yanlış cevapta da kimlik yakılır.
  entry.used = true;

  if (!sameText(normalizeAnswer(entry.answer), normalizeAnswer(answer))) {
    throw new HttpError(400, "Güvenlik doğrulaması yanlış. Yeni yazı isteyin.", "captcha_failed");
  }

  challenges.delete(String(id));
  return true;
}

/** Cloudflare Turnstile belirtecini doğrular. */
export async function checkTurnstile(token, remoteIp) {
  if (!TURNSTILE_SECRET_KEY) {
    throw new HttpError(
      503,
      "Turnstile seçili ama TURNSTILE_SECRET_KEY boş. Anahtarları .env dosyasına ekleyip sunucuyu yeniden başlat (güvenlik doğrulaması yapılamadığı için kayıt kapalı).",
      "captcha_unconfigured",
    );
  }
  if (!token) throw new HttpError(400, "Güvenlik doğrulaması gerekli", "captcha_required");

  let data;
  try {
    const body = new URLSearchParams({ secret: TURNSTILE_SECRET_KEY, response: String(token) });
    if (remoteIp) body.set("remoteip", String(remoteIp));

    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    data = await response.json();
  } catch (error) {
    throw new HttpError(502, `Turnstile doğrulanamadı: ${error.message}`, "captcha_failed");
  }

  if (!data?.success) {
    throw new HttpError(400, "Güvenlik doğrulaması başarısız. Sayfayı yenileyip tekrar dene.", "captcha_failed");
  }
  return true;
}

/**
 * Panel ayarı + .env birlikte çözülmüş captcha türü.
 *
 * Fail-closed: "turnstile" seçildiyse anahtarlar eksik olsa bile anahtar yokken
 * sessizce kapanmaz; kayıt 503 ile reddedilir ve panel/kayıt ekranı nedeni görür.
 */
export function resolveCaptchaProvider(configured, method) {
  if (configured === "turnstile") return "turnstile";
  if (configured === "local") return "local";
  if (method === "captcha") return "local";
  return "none";
}

/** Turnstile için site + secret anahtarı birlikte var mı? */
export function turnstileReady() {
  return Boolean(TURNSTILE_SITE_KEY && TURNSTILE_SECRET_KEY);
}

/** Kayıt isteğindeki captcha alanlarını doğrular. */
export async function enforceCaptcha(provider, body, request) {
  if (provider === "local") {
    if (!body.captcha_id || !body.captcha_answer) {
      throw new HttpError(400, "Güvenlik doğrulaması gerekli", "captcha_required");
    }
    checkLocalChallenge(body.captcha_id, body.captcha_answer);
    return;
  }

  if (provider === "turnstile") {
    await checkTurnstile(body.turnstile_token, request.ip);
  }
}

export { CAPTCHA_PROVIDER };
