// Moderasyon: ban (engel) ve susturma durumları.
// Kullanıcı belgesinde banned / ban_until / ban_reason ve muted / mute_until /
// mute_reason alanları tutulur. `*_until` boşsa ceza süresizdir.
import { HttpError } from "./http.js";

function stillActive(until) {
  if (!until) return true;
  const at = Date.parse(until);
  return Number.isNaN(at) || at > Date.now();
}

export function moderationState(user) {
  if (!user) return { banned: false, muted: false };
  return {
    banned: !!user.banned && stillActive(user.ban_until),
    ban_reason: user.banned ? user.ban_reason || "" : "",
    ban_until: user.banned ? user.ban_until || null : null,
    muted: !!user.muted && stillActive(user.mute_until),
    mute_reason: user.muted ? user.mute_reason || "" : "",
    mute_until: user.muted ? user.mute_until || null : null,
  };
}

/** Banlı hesap hiçbir API çağrısı yapamaz (giriş ve mevcut oturumlar dahil). */
export function assertNotBanned(user) {
  const state = moderationState(user);
  if (!state.banned) return;
  const reason = state.ban_reason ? `: ${state.ban_reason}` : "";
  throw new HttpError(403, `Hesabın askıya alındı${reason}`, "account_banned");
}

/** Susturulmuş hesap okuyabilir ama yeni içerik üretemez. */
export function assertNotMuted(user) {
  const state = moderationState(user);
  if (!state.muted) return;
  const reason = state.mute_reason ? `: ${state.mute_reason}` : "";
  throw new HttpError(403, `Susturuldun${reason}`, "account_muted");
}
