// Dosyadan yönetici tanımı ve site ayarları.
//
// Yönetici, ilk kayıt olan kişi değildir: proje kökündeki admin.json dosyasında
// yazan e-posta + parola ile açılan hesap yöneticidir. Sunucu her açılışta bu
// dosyayı okur; hesap yoksa oluşturur, varsa parolasını dosyadaki değere çeker
// ve rolünü "admin" yapar. Böylece dosyayı düzenleyip sunucuyu yeniden
// başlatarak yönetici erişimini her zaman geri alabilirsin.
import fs from "node:fs";

import { ADMIN_FILE, CAPTCHA_PROVIDER, CAPTCHA_PROVIDERS, REGISTRATION_METHOD, REGISTRATION_METHODS, REQUIRE_EMAIL_VERIFICATION } from "./config.js";
import { hashPassword } from "./auth.js";
import { getStore, newId, nowIso } from "./store.js";

export const SETTINGS_ID = "site";

export const DEFAULT_SETTINGS = {
  site_name: "KRYPT",
  motd: "",
  allow_registration: true,
  allow_communities: true,
  allow_channels: true,
  require_email_verification: true,
  // Boş = .env değeri kullanılır. Panelden seçilirse .env'i geçersiz kılar.
  registration_method: "",
  captcha_provider: "",
};

let cachedSettings = null;

export function readAdminFile() {
  if (!fs.existsSync(ADMIN_FILE)) {
    console.warn(`[admin] ${ADMIN_FILE} bulunamadı — dosya tabanlı yönetici tanımlanmadı.`);
    return null;
  }

  try {
    const raw = JSON.parse(fs.readFileSync(ADMIN_FILE, "utf8"));
    const email = String(raw?.email || "").trim().toLowerCase();
    const password = String(raw?.password || "");

    if (!email.includes("@") || password.length < 8) {
      console.warn(`[admin] ${ADMIN_FILE} geçersiz: "email" ve en az 8 karakterlik "password" gerekli.`);
      return null;
    }
    return { email, password };
  } catch (error) {
    console.warn(`[admin] ${ADMIN_FILE} okunamadı: ${error.message}`);
    return null;
  }
}

/** admin.json'daki hesabı oluşturur/günceller ve admin rolüne alır. */
export async function ensureFileAdmin() {
  const creds = readAdminFile();
  if (!creds) return null;

  const store = await getStore();
  const [existing] = await store.find("users", { email: creds.email }, "-created_date", 1);
  const password_hash = await hashPassword(creds.password);

  if (!existing) {
    const created = await store.create("users", {
      id: newId(),
      email: creds.email,
      password_hash,
      full_name: creds.email.split("@")[0],
      role: "admin",
      email_verified: true,
      created_date: nowIso(),
      updated_date: nowIso(),
    });
    console.log(`[admin] Dosyadan yönetici oluşturuldu: ${creds.email} (${ADMIN_FILE})`);
    return created;
  }

  const updated = await store.update("users", existing.id, {
    password_hash,
    role: "admin",
    email_verified: true,
    banned: false,
    ban_until: null,
    ban_reason: "",
    updated_date: nowIso(),
  });
  console.log(`[admin] Dosyadaki yönetici hesabı eşitlendi: ${creds.email} (${ADMIN_FILE})`);
  return updated;
}

export async function getSettings() {
  if (cachedSettings) return cachedSettings;
  const store = await getStore();
  const doc = await store.get("Settings", SETTINGS_ID);
  cachedSettings = { ...DEFAULT_SETTINGS, ...(doc || {}) };
  return cachedSettings;
}

export async function saveSettings(patch) {
  const store = await getStore();
  const current = await getSettings();
  const next = { ...current };

  for (const key of Object.keys(DEFAULT_SETTINGS)) {
    if (patch[key] !== undefined) next[key] = patch[key];
  }

  const existing = await store.get("Settings", SETTINGS_ID);
  const stamp = nowIso();
  const saved = existing
    ? await store.update("Settings", SETTINGS_ID, { ...next, updated_date: stamp })
    : await store.create("Settings", { id: SETTINGS_ID, ...next, created_date: stamp, updated_date: stamp });

  cachedSettings = { ...next };
  return saved;
}

export function resetSettingsCache() {
  cachedSettings = null;
}

/** Kayıt sırasında e-posta doğrulaması isteniyor mu? (env + panel ayarı) */
export async function emailVerificationRequired() {
  if (!REQUIRE_EMAIL_VERIFICATION) return false;
  const settings = await getSettings();
  return settings.require_email_verification !== false;
}

/** Etkin kayıt yöntemi: panel seçimi varsa o, yoksa .env (REGISTRATION_METHOD). */
export async function registrationMethod() {
  const settings = await getSettings();
  return REGISTRATION_METHODS.includes(settings.registration_method)
    ? settings.registration_method
    : REGISTRATION_METHOD;
}

/** Etkin captcha sağlayıcısı: panel seçimi varsa o, yoksa .env (CAPTCHA_PROVIDER). */
export async function captchaProvider() {
  const settings = await getSettings();
  return CAPTCHA_PROVIDERS.includes(settings.captcha_provider) ? settings.captcha_provider : CAPTCHA_PROVIDER;
}

export { ADMIN_FILE };
