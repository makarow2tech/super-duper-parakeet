// Oturumluk kasa durumu: özel anahtar yalnızca sekme belleğinde tutulur.
const listeners = new Set();

function sessionKey(userId) {
  return `krypt.vault.${userId}`;
}

export function getSessionPrivateKey(userId) {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = window.sessionStorage.getItem(sessionKey(userId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSessionPrivateKey(userId, privateKeyJwk) {
  if (typeof window === "undefined" || !userId) return;
  try {
    window.sessionStorage.setItem(sessionKey(userId), JSON.stringify(privateKeyJwk));
  } catch {
    /* Depolama engelliyse kasa yalnızca bu sayfa ömrü boyunca açık kalır. */
  }
  listeners.forEach((fn) => fn());
}

export function lockVault(userId) {
  if (typeof window === "undefined" || !userId) return;
  window.sessionStorage.removeItem(sessionKey(userId));
  listeners.forEach((fn) => fn());
}

export function subscribeVault(callback) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}