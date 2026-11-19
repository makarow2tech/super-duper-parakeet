// Davet kodları: panelden üretilir, süre ve kullanım sınırı taşır.
// Kayıt yöntemi "invite" iken yeni üye olmak için geçerli bir kod gerekir.
import crypto from "node:crypto";

import { HttpError } from "./http.js";
import { getStore, newId, nowIso } from "./store.js";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // karışan harfler yok (I/O/0/1)
const MAX_NOTE = 120;

function block(length = 4) {
  return Array.from({ length }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join("");
}

/** Örn. "K7QM-3ZTA" — kullanıcıya okunması/iletilmesi kolay. */
export function newInviteCode() {
  return `${block()}-${block()}`;
}

export function normalizeCode(value) {
  return String(value || "").trim().toUpperCase();
}

/** Kodun o anki durumu (panel listesi ve kayıt kontrolü ortak kullanır). */
export function inviteState(invite) {
  if (!invite) return { valid: false, reason: "missing" };

  const maxUses = Number(invite.max_uses ?? 1);
  const used = Number(invite.used_count ?? 0);
  const unlimited = maxUses <= 0;
  const expired = Boolean(invite.expires_at) && new Date(invite.expires_at).getTime() <= Date.now();
  const exhausted = !unlimited && used >= maxUses;
  const inactive = invite.active === false;

  return {
    valid: !expired && !exhausted && !inactive,
    reason: inactive ? "inactive" : expired ? "expired" : exhausted ? "exhausted" : "",
    unlimited,
    uses_left: unlimited ? null : Math.max(0, maxUses - used),
    expired,
    exhausted,
  };
}

export async function createInvite({ note = "", max_uses = 1, days = 7 } = {}) {
  const uses = Number.isFinite(Number(max_uses)) ? Math.trunc(Number(max_uses)) : 1;
  const lifetime = Number.isFinite(Number(days)) ? Math.trunc(Number(days)) : 7;

  if (uses < 0 || uses > 1000) throw new HttpError(400, "Kullanım sınırı 0–1000 arasında olmalı");
  if (lifetime < 0 || lifetime > 3650) throw new HttpError(400, "Geçerlilik 0–3650 gün arasında olmalı");

  const store = await getStore();
  const stamp = nowIso();
  const code = newInviteCode();

  return store.create("Invite", {
    id: newId(),
    code,
    note: String(note || "").trim().slice(0, MAX_NOTE),
    max_uses: uses,
    used_count: 0,
    expires_at: lifetime === 0 ? null : new Date(Date.now() + lifetime * 86_400_000).toISOString(),
    active: true,
    created_date: stamp,
    updated_date: stamp,
  });
}

/** Kayıt sırasında kodu bulur ve kullanılabilir olduğunu doğrular. */
export async function requireUsableInvite(rawCode) {
  const code = normalizeCode(rawCode);
  if (!code) throw new HttpError(400, "Davet kodu gerekli", "invite_required");

  const store = await getStore();
  const [invite] = await store.find("Invite", { code }, "-created_date", 1);
  if (!invite) throw new HttpError(400, "Davet kodu geçersiz", "invite_invalid");

  const state = inviteState(invite);
  if (!state.valid) {
    const message =
      state.reason === "expired"
        ? "Davet kodunun süresi dolmuş"
        : state.reason === "exhausted"
          ? "Davet kodunun kullanım sınırı dolmuş"
          : "Davet kodu devre dışı";
    throw new HttpError(400, message, `invite_${state.reason}`);
  }

  return invite;
}

/** Kullanım sayacını artırır (kayıt başarılı olduktan sonra çağrılır). */
export async function consumeInvite(invite) {
  const store = await getStore();
  return store.update("Invite", invite.id, {
    used_count: Number(invite.used_count ?? 0) + 1,
    updated_date: nowIso(),
  });
}
