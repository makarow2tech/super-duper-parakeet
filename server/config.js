// Ortam ayarları. Tek dosya: hem `node server/index.js` hem testler buradan okur.
//
// Yapılandırma sırası (önce gelen kazanır):
//   1) süreç ortam değişkenleri (shell / Docker / systemd)
//   2) kök dizindeki .env            ← yöneticinin düzenlediği asıl dosya
//   3) server/.env                   ← eski yerleşim, hâlâ okunur
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { parse as parseEnv } from "dotenv";

export const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = path.resolve(SERVER_DIR, "..");
export const DATA_DIR = path.join(SERVER_DIR, "data");

fs.mkdirSync(DATA_DIR, { recursive: true });

const ROOT_ENV = path.join(ROOT_DIR, ".env");
const SERVER_ENV = path.join(SERVER_DIR, ".env");

/** Var olan ilk .env dosyası (yöneticiye "hangi dosya okunuyor" bilgisi için). */
export const ENV_FILE = fs.existsSync(ROOT_ENV)
  ? ROOT_ENV
  : fs.existsSync(SERVER_ENV)
    ? SERVER_ENV
    : ROOT_ENV;

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(file)))) {
    // Gerçek ortam değişkenleri .env'i her zaman yener.
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

loadEnvFile(ROOT_ENV);
loadEnvFile(SERVER_ENV);

const text = (key) => (process.env[key] || "").trim();

// --------------------------------------------------------------- Veritabanı
// Tür: sqlite | mysql | supabase | firebase
const BACKEND_ALIASES = {
  sql: "sqlite",
  sqlite: "sqlite",
  better_sqlite3: "sqlite",
  mysql: "mysql",
  mariadb: "mysql",
  postgres: "supabase",
  postgresql: "supabase",
  supabase: "supabase",
  firebase: "firebase",
  rtdb: "firebase",
  firebase_rtdb: "firebase",
};

const requested = (text("DB_BACKEND") || text("DB_TYPE") || "sqlite").toLowerCase();
const resolved = BACKEND_ALIASES[requested];

if (!resolved) {
  throw new Error(
    `DB_BACKEND="${requested}" tanınmıyor. Geçerli değerler: sqlite, mysql, supabase, firebase.`,
  );
}

export const DB_BACKEND = resolved;
export const DB_LABEL = {
  sqlite: "SQLite",
  mysql: "MySQL / MariaDB",
  supabase: "Supabase (PostgreSQL)",
  firebase: "Firebase Realtime Database",
}[DB_BACKEND];

const DB_PORT_DEFAULT = { mysql: "3306", supabase: "5432" };

/** Bağlantı adresi verilmediyse DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD'tan kurar. */
function urlFromParts() {
  const host = text("DB_HOST");
  const user = text("DB_USER");
  const database = text("DB_NAME") || (DB_BACKEND === "mysql" ? "krypt" : "postgres");
  const port = text("DB_PORT") || DB_PORT_DEFAULT[DB_BACKEND] || "";
  const password = process.env.DB_PASSWORD ?? "";

  if (!host || !user) return "";
  const scheme = DB_BACKEND === "mysql" ? "mysql" : "postgresql";
  const auth = password
    ? `${encodeURIComponent(user)}:${encodeURIComponent(password)}`
    : encodeURIComponent(user);

  return `${scheme}://${auth}@${host}${port ? `:${port}` : ""}/${database}`;
}

// .env şablonundan kalan yanlış türdeki satır (örn. DB_BACKEND=mysql iken
// sqlite:///...) yok sayılır; böylece yönetici tek satırı değiştirmek zorunda kalmaz.
const SCHEMES = { sqlite: /^sqlite:/, mysql: /^mysql2?:\/\//, supabase: /^postgres(ql)?:\/\// };
const matchesBackend = (url) => !url || !SCHEMES[DB_BACKEND] || SCHEMES[DB_BACKEND].test(url);

const URL_FROM_ENV = matchesBackend(text("DATABASE_URL")) ? text("DATABASE_URL") : "";

export const DATABASE_URL =
  URL_FROM_ENV ||
  (DB_BACKEND === "firebase" ? "" : DB_BACKEND === "sqlite" ? "sqlite:///./data/krypt.db" : urlFromParts());

export const DATABASE_SSL =
  (text("DB_SSL") || text("DATABASE_SSL") || "").toLowerCase() === "false"
    ? false
    : DB_BACKEND === "supabase" || (text("DB_SSL") || text("DATABASE_SSL")) === "true";

/** Yönetici hesabının e-posta + parolasını taşıyan dosya (varsayılan: proje kökü/admin.json). */
export const ADMIN_FILE = path.resolve(ROOT_DIR, text("ADMIN_FILE") || "admin.json");

export const FIREBASE_CREDENTIALS = text("FIREBASE_CREDENTIALS");
export const FIREBASE_DATABASE_URL = text("FIREBASE_DATABASE_URL");
export const FIREBASE_PROJECT_ID = text("FIREBASE_PROJECT_ID");

/**
 * Seçilen veritabanı için eksik/hatalı ayar varsa açıklayıcı Türkçe mesaj döner.
 * Sunucu açılışta bunu kontrol eder; hata varsa anlaşılır biçimde durur.
 */
export function dbConfigError() {
  if (DB_BACKEND === "firebase") {
    if (!FIREBASE_DATABASE_URL) {
      return (
        "DB_BACKEND=firebase seçildi ama FIREBASE_DATABASE_URL yok. " +
        "Firebase Console → Realtime Database adresini .env dosyasına yaz " +
        "(örn. https://PROJE-default-rtdb.firebaseio.com)."
      );
    }
    if (FIREBASE_DATABASE_URL && !/^https?:\/\//.test(FIREBASE_DATABASE_URL)) {
      return `FIREBASE_DATABASE_URL geçersiz ("${FIREBASE_DATABASE_URL}"); https:// ile başlamalı.`;
    }
    return null;
  }

  if (!DATABASE_URL) {
    const keys =
      DB_BACKEND === "mysql"
        ? "DATABASE_URL ya da DB_HOST + DB_NAME + DB_USER + DB_PASSWORD"
        : "DATABASE_URL ya da DB_HOST + DB_NAME + DB_USER + DB_PASSWORD";
    return `DB_BACKEND=${DB_BACKEND} seçildi ama bağlantı bilgisi yok. .env dosyasına ${keys} yaz.`;
  }

  return null;
}

/** Parolayı gizleyerek bağlantı hedefini özetler (loglar ve /api/health için). */
export function redact(url) {
  try {
    const parsed = new URL(url);
    if (parsed.username || parsed.password) {
      parsed.username = parsed.username ? "***" : "";
      parsed.password = "";
    }
    return decodeURIComponent(parsed.toString());
  } catch {
    return url.replace(/\/\/[^@/]*@/, "//***@");
  }
}

export const DB_TARGET =
  DB_BACKEND === "firebase"
    ? FIREBASE_DATABASE_URL || "(tanımsız)"
    : DB_BACKEND === "sqlite"
      ? DATABASE_URL.replace(/^sqlite:(\/\/\/?)?/, "") || ":memory:"
      : redact(DATABASE_URL || "(tanımsız)");

// --------------------------------------------------------------- Sunucu
export const PORT = Number(process.env.PORT || 8000);
export const HOST = process.env.HOST || "0.0.0.0";
export const TOKEN_DAYS = Number(process.env.TOKEN_DAYS || 7);
export const ALLOW_REGISTRATION = (process.env.ALLOW_REGISTRATION ?? "true").toLowerCase() !== "false";
// Kayıtta e-posta doğrulaması. Panelden ayarlanır; bu değişken false ise tamamen kapanır.
export const REQUIRE_EMAIL_VERIFICATION =
  (process.env.REQUIRE_EMAIL_VERIFICATION ?? "true").toLowerCase() !== "false";
// Aynı IP'den 5 dakikada en fazla kaç kayıt denemesi (testler için artırılabilir).
export const REGISTER_RATE_LIMIT = Number(process.env.REGISTER_RATE_LIMIT || 10);

// --------------------------------------------------------------- Kayıt yöntemi
// email    → e-posta + parola, doğrulama bağlantısı
// invite   → kullanıcı adı + parola + panelden üretilen davet kodu
// captcha  → kullanıcı adı + parola + kendi captcha'mız
// telegram → kullanıcı adı + parola, Telegram botuna /start <kod>
// open     → kullanıcı adı + parola, ek doğrulama yok
export const REGISTRATION_METHODS = ["email", "invite", "captcha", "telegram", "open"];
export const REGISTRATION_METHOD = (() => {
  const value = (text("REGISTRATION_METHOD") || "email").toLowerCase();
  return REGISTRATION_METHODS.includes(value) ? value : "email";
})();

// Kayıt formundaki insan doğrulaması: none | local | turnstile
export const CAPTCHA_PROVIDERS = ["none", "local", "turnstile"];
export const CAPTCHA_PROVIDER = (() => {
  const value = (text("CAPTCHA_PROVIDER") || "none").toLowerCase();
  return CAPTCHA_PROVIDERS.includes(value) ? value : "none";
})();

// Cloudflare Turnstile (CAPTCHA_PROVIDER=turnstile)
export const TURNSTILE_SITE_KEY = text("TURNSTILE_SITE_KEY");
export const TURNSTILE_SECRET_KEY = text("TURNSTILE_SECRET_KEY");

// Telegram botu (REGISTRATION_METHOD=telegram)
export const TELEGRAM_BOT_TOKEN = text("TELEGRAM_BOT_TOKEN");
export const TELEGRAM_BOT_USERNAME = text("TELEGRAM_BOT_USERNAME").replace(/^@/, "");
export const TELEGRAM_WEBHOOK_SECRET = text("TELEGRAM_WEBHOOK_SECRET");
export const CORS_ORIGINS = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
export const APP_URL = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/+$/, "");
export const TRUST_PROXY = (process.env.TRUST_PROXY || "true").toLowerCase() !== "false";

// --------------------------------------------------------------- E-posta
export const SMTP_HOST = text("SMTP_HOST");
export const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
export const SMTP_SECURE = (process.env.SMTP_SECURE || "").toLowerCase() === "true";
export const SMTP_USER = text("SMTP_USER");
export const SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";
export const SMTP_FROM = process.env.SMTP_FROM || "noreply@example.com";
// Mailpit gibi yerel bir SMTP yakalayıcısı kullanılıyorsa (kimlik doğrulaması yok).
export const SMTP_IS_LOCAL = /^(localhost|127\.0\.0\.1|mailpit)$/i.test(SMTP_HOST);

export const FRONTEND_DIR = path.resolve(
  process.env.FRONTEND_DIR || path.join(ROOT_DIR, "dist", "client"),
);

// --------------------------------------------------------------- JWT anahtarı
function jwtSecret() {
  const fromEnv = text("JWT_SECRET");
  if (fromEnv) return fromEnv;

  const file = path.join(DATA_DIR, ".jwt_secret");
  if (fs.existsSync(file)) {
    const saved = fs.readFileSync(file, "utf8").trim();
    if (saved) return saved;
  }

  const value = crypto.randomBytes(48).toString("base64url");
  fs.writeFileSync(file, value, { mode: 0o600 });
  return value;
}

export const JWT_SECRET = jwtSecret();
