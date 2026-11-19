// Veritabanı seçim sihirbazı: `npm run setup`
// Seçilen arka uca göre kök dizindeki .env dosyasını yazar (diğer ayarları korur).
// Elle düzenlemek isteyen için: .env.example
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const SERVER_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(SERVER_DIR, "..");
const ENV_FILE = path.join(ROOT_DIR, ".env");
const LEGACY_ENV_FILE = path.join(SERVER_DIR, ".env");

const BACKENDS = [
  {
    id: "sqlite",
    label: "SQLite — kurulum gerektirmez, dosyada saklar (varsayılan)",
  },
  {
    id: "mysql",
    label: "MySQL / MariaDB — kendi sunucun",
  },
  {
    id: "supabase",
    label: "Supabase — barındırılan PostgreSQL (Project Settings → Database → Connection string)",
  },
  {
    id: "firebase",
    label: "Firebase Realtime Database — Google bulutu",
  },
];

const DB_KEYS = [
  "DB_BACKEND",
  "DATABASE_URL",
  "DB_HOST",
  "DB_PORT",
  "DB_NAME",
  "DB_USER",
  "DB_PASSWORD",
  "DB_SSL",
  "FIREBASE_DATABASE_URL",
  "FIREBASE_CREDENTIALS",
  "FIREBASE_PROJECT_ID",
];

function readEnvFile(file) {
  if (!fs.existsSync(file)) return new Map();
  const entries = new Map();

  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match) entries.set(match[1], match[2]);
  }
  return entries;
}

function readEnv() {
  // Kök .env asıl; yoksa eski server/.env ile başla (geçiş kolaylığı).
  return fs.existsSync(ENV_FILE) ? readEnvFile(ENV_FILE) : readEnvFile(LEGACY_ENV_FILE);
}

function writeEnv(entries) {
  const lines = [
    "# KRYPT yapılandırması — `npm run setup` tarafından yazıldı, düzenlemek serbest.",
    "# Veritabanı türü: sqlite | mysql | supabase | firebase",
    "",
  ];

  const ordered = [
    ...DB_KEYS.filter((key) => entries.has(key)).map((key) => [key, entries.get(key)]),
    ...[...entries.entries()].filter(([key]) => !DB_KEYS.includes(key)),
  ];
  const serverKeys = ordered.filter(([key]) => !DB_KEYS.includes(key));

  lines.push("# --- Veritabanı (yalnızca seçilen türün satırları geçerlidir) ----------");
  for (const [key, value] of ordered.filter(([key]) => DB_KEYS.includes(key))) {
    lines.push(`${key}=${value}`);
  }

  if (serverKeys.length) {
    lines.push("", "# --- Sunucu / e-posta ------------------------------------------------");
    for (const [key, value] of serverKeys) lines.push(`${key}=${value}`);
  }

  fs.mkdirSync(ROOT_DIR, { recursive: true });
  fs.writeFileSync(ENV_FILE, `${lines.join("\n")}\n`, { mode: 0o600 });
}

function clean(value) {
  return String(value || "").trim();
}

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    console.log("\nKRYPT — veritabanı seçimi\n");
    BACKENDS.forEach((backend, index) => console.log(`  ${index + 1}) ${backend.label}`));

    const answer = clean(await rl.question("\nHangisi? [1-4] (1): ")) || "1";
    const chosen = BACKENDS[Number(answer) - 1];

    if (!chosen) {
      console.error("Geçersiz seçim.");
      process.exitCode = 1;
      return;
    }

    const entries = readEnv();
    // Önceki türün bağlantı satırlarını temizle: .env'de tek tür kalsın.
    for (const key of DB_KEYS) entries.delete(key);
    entries.set("DB_BACKEND", chosen.id);

    if (chosen.id === "sqlite") {
      entries.set("DATABASE_URL", "sqlite:///./data/krypt.db");
      console.log("\nSQLite: server/data/krypt.db kullanılacak.");
    }

    if (chosen.id === "mysql") {
      console.log(
        "\nMySQL bağlantı bilgileri (sunucuda hazır bir veritabanı ve kullanıcı olmalı).",
      );
      const host = clean(await rl.question("Sunucu adresi [127.0.0.1]: ")) || "127.0.0.1";
      const port = clean(await rl.question("Port [3306]: ")) || "3306";
      const database = clean(await rl.question("Veritabanı adı [krypt]: ")) || "krypt";
      const username = clean(await rl.question("Kullanıcı [krypt]: ")) || "krypt";
      const password = await rl.question("Parola: ");

      entries.set("DB_HOST", host);
      entries.set("DB_PORT", port);
      entries.set("DB_NAME", database);
      entries.set("DB_USER", username);
      entries.set("DB_PASSWORD", password);
      console.log(`\nMySQL: ${host}:${port}/${database}`);
    }

    if (chosen.id === "supabase") {
      console.log(
        "\nSupabase → Project Settings → Database → Connection string → URI.\n" +
          "Pooler adresi (port 6543) önerilir. Parolada özel karakter varsa URL-kodla.",
      );
      const url = clean(await rl.question("Bağlantı adresi (postgresql://...): "));

      if (!url) {
        console.error("Bağlantı adresi gerekli.");
        process.exitCode = 1;
        return;
      }
      entries.set("DATABASE_URL", url);
      entries.set("DB_SSL", "true");
    }

    if (chosen.id === "firebase") {
      console.log(
        "\nFirebase Console → Realtime Database → veritabanı URL'si\n" +
          "ve Project settings → Service accounts → Generate new private key.",
      );
      const databaseUrl = clean(await rl.question("Realtime Database URL'si: "));
      const credentials = clean(
        await rl.question("Servis hesabı JSON dosyası [./data/firebase-service-account.json]: "),
      ) || "./data/firebase-service-account.json";

      if (!databaseUrl) {
        console.error("Realtime Database URL'si gerekli.");
        process.exitCode = 1;
        return;
      }
      entries.set("FIREBASE_DATABASE_URL", databaseUrl);
      entries.set("FIREBASE_CREDENTIALS", credentials);
    }

    if (!entries.get("JWT_SECRET")) {
      entries.set("JWT_SECRET", crypto.randomBytes(48).toString("base64url"));
    }
    if (!entries.get("ALLOW_REGISTRATION")) entries.set("ALLOW_REGISTRATION", "true");

    writeEnv(entries);

    console.log(`\n✓ ${path.relative(ROOT_DIR, ENV_FILE) || ".env"} yazıldı (${chosen.id}).`);
    console.log("Sonraki adım:  npm run build && npm start\n");
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error("Kurulum başarısız:", error.message);
  process.exit(1);
});
