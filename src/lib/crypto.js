// ============================================================================
// KRYPT · uçtan uca şifreleme çekirdeği
// İçerik: AES-256-GCM · Yeni kimliklerde kanal anahtarı sarması: RSA-OAEP-4096
// Önceden oluşturulmuş 2048-bit anahtarlar, mevcut veriye erişim için desteklenir.
// Kasa: PBKDF2-SHA256 (310k) ile türetilen AES-256 anahtarı
// Düz metin asla sunucuya gitmez.
// ============================================================================

const enc = new TextEncoder();
const dec = new TextDecoder();

export function toB64(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let out = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    out += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(out);
}

export function fromB64(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

function randomBytes(n) {
  return crypto.getRandomValues(new Uint8Array(n));
}

const RSA = { name: "RSA-OAEP", hash: "SHA-256" };
const RSA_GEN = {
  name: "RSA-OAEP",
  modulusLength: 4096,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256",
};
const KDF_ITERATIONS = 310000;

async function importAesKey(rawKeyB64) {
  return crypto.subtle.importKey("raw", fromB64(rawKeyB64), { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

// ---------------------------------------------------------------------------
// Kimlik
// ---------------------------------------------------------------------------

export async function createIdentity() {
  const pair = await crypto.subtle.generateKey(RSA_GEN, true, ["encrypt", "decrypt"]);
  const publicJwk = await crypto.subtle.exportKey("jwk", pair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return { publicJwk, privateJwk };
}

export async function fingerprint(publicJwk) {
  const jwk = typeof publicJwk === "string" ? JSON.parse(publicJwk) : publicJwk;
  const material = `${jwk.n || ""}.${jwk.e || ""}`;
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(material));
  const hex = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hex.slice(0, 32).match(/.{1,4}/g).join(" ").toUpperCase();
}

// ---------------------------------------------------------------------------
// Kasa
// ---------------------------------------------------------------------------

async function deriveWrappingKey(passphrase, salt) {
  const base = await crypto.subtle.importKey("raw", enc.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: KDF_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function sealPrivateKey(privateJwk, passphrase) {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const wrapKey = await deriveWrappingKey(passphrase, salt);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, wrapKey, enc.encode(JSON.stringify(privateJwk)));
  return JSON.stringify({
    v: 1,
    kdf: "PBKDF2-SHA256",
    iterations: KDF_ITERATIONS,
    salt: toB64(salt),
    iv: toB64(iv),
    ct: toB64(ct),
  });
}

export async function openPrivateKey(vaultBlob, passphrase) {
  const blob = typeof vaultBlob === "string" ? JSON.parse(vaultBlob) : vaultBlob;
  const wrapKey = await deriveWrappingKey(passphrase, fromB64(blob.salt));
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(blob.iv) },
      wrapKey,
      fromB64(blob.ct)
    );
    return JSON.parse(dec.decode(plain));
  } catch {
    const error = new Error("Kasa parolası hatalı.");
    error.code = "BAD_PASSPHRASE";
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Kanal anahtarları
// ---------------------------------------------------------------------------

export function newChannelKey() {
  return toB64(randomBytes(32));
}

export async function wrapChannelKey(keyB64, publicJwk) {
  const jwk = typeof publicJwk === "string" ? JSON.parse(publicJwk) : publicJwk;
  const pub = await crypto.subtle.importKey("jwk", jwk, RSA, false, ["encrypt"]);
  const wrapped = await crypto.subtle.encrypt(RSA, pub, fromB64(keyB64));
  return toB64(wrapped);
}

export async function unwrapChannelKey(wrappedB64, privateJwk) {
  const jwk = typeof privateJwk === "string" ? JSON.parse(privateJwk) : privateJwk;
  const priv = await crypto.subtle.importKey("jwk", jwk, RSA, false, ["decrypt"]);
  const raw = await crypto.subtle.decrypt(RSA, priv, fromB64(wrappedB64));
  return toB64(new Uint8Array(raw));
}

// Herkese açık kanalların anahtarı kanal kimliğinden türetilir: içerik
// herkese açıktır, yalnızca sunucudaki düz metni önler.
const publicKeyCache = new Map();

export function publicChannelKey(channelId) {
  if (!publicKeyCache.has(channelId)) {
    publicKeyCache.set(
      channelId,
      (async () => {
        const base = await crypto.subtle.importKey("raw", enc.encode("krypt.public.v1"), "PBKDF2", false, [
          "deriveKey",
        ]);
        const key = await crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: enc.encode(`channel:${channelId}`),
            iterations: 120000,
            hash: "SHA-256",
          },
          base,
          { name: "AES-GCM", length: 256 },
          true,
          ["encrypt", "decrypt"]
        );
        return toB64(await crypto.subtle.exportKey("raw", key));
      })()
    );
  }
  return publicKeyCache.get(channelId);
}

// ---------------------------------------------------------------------------
// Mesaj şifreleme
// ---------------------------------------------------------------------------

export async function encryptMessage(text, keyB64) {
  const key = await importAesKey(keyB64);
  const iv = randomBytes(12);
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(text));
  return JSON.stringify({ v: 1, alg: "AES-256-GCM", iv: toB64(iv), ct: toB64(ct) });
}

export async function decryptMessage(cipherJson, keyB64) {
  if (!cipherJson || !keyB64) return "";
  try {
    const payload = typeof cipherJson === "string" ? JSON.parse(cipherJson) : cipherJson;
    const key = await importAesKey(keyB64);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromB64(payload.iv) },
      key,
      fromB64(payload.ct)
    );
    return dec.decode(plain);
  } catch {
    return "";
  }
}