// Varlıklar ve erişim kuralları (RLS). Kural dili Mongo benzeri:
// "data." öneki kaldırılır, {{user.id}} gerçek kimlikle değiştirilir,
// user_condition (rol kontrolü) istek anında çözülür.
import { NEVER } from "./query.js";

const ADMIN = { user_condition: { role: "admin" } };
const OWN = { created_by_id: "{{user.id}}" };
const OWN_OR_ADMIN = { $or: [OWN, ADMIN] };

const PUBLIC_OR_MEMBER = {
  $or: [{ "data.visibility": "public" }, { "data.members": "{{user.id}}" }, ADMIN],
};

export const ENTITIES = {
  Profile: {
    fields: ["user_id", "handle", "display_name", "public_key", "bio"],
    required: ["user_id", "handle", "public_key"],
    unique: ["handle"],
    rls: { read: {}, create: OWN, update: OWN_OR_ADMIN, delete: OWN_OR_ADMIN },
  },
  Vault: {
    fields: ["user_id", "vault_blob", "fingerprint"],
    required: ["user_id", "vault_blob"],
    rls: { read: OWN, create: OWN, update: OWN, delete: OWN },
  },
  Community: {
    fields: ["name", "slug", "description", "owner_id", "owner_handle"],
    required: ["name", "slug"],
    unique: ["slug"],
    rls: { read: {}, create: OWN, update: OWN_OR_ADMIN, delete: OWN_OR_ADMIN },
  },
  Channel: {
    fields: [
      "name",
      "slug",
      "description",
      "visibility",
      "kind",
      "owner_id",
      "owner_handle",
      "members",
      "accent",
      "community_id",
      "community_name",
      "community_slug",
    ],
    required: ["name", "slug", "visibility", "kind"],
    enums: {
      visibility: ["public", "private"],
      kind: ["general", "custom", "direct"],
    },
    rls: {
      read: PUBLIC_OR_MEMBER,
      create: OWN,
      update: { $or: [OWN, { "data.members": { $in: ["{{user.id}}"] } }, ADMIN] },
      delete: OWN_OR_ADMIN,
    },
  },
  ChannelMember: {
    fields: ["channel_id", "user_id", "handle", "role", "wrapped_key"],
    required: ["channel_id", "user_id", "wrapped_key"],
    enums: { role: ["owner", "member"] },
    rls: {
      read: { $or: [{ "data.user_id": "{{user.id}}" }, OWN, ADMIN] },
      create: OWN,
      update: { $or: [{ "data.user_id": "{{user.id}}" }, OWN, ADMIN] },
      delete: { $or: [{ "data.user_id": "{{user.id}}" }, OWN, ADMIN] },
    },
  },
  Message: {
    fields: ["channel_id", "author_id", "author_handle", "cipher", "kind"],
    required: ["channel_id", "cipher"],
    enums: { kind: ["text", "system"] },
    rls: { read: {}, create: OWN, update: OWN_OR_ADMIN, delete: OWN_OR_ADMIN },
  },
  Report: {
    fields: ["target_type", "target_id", "target_handle", "reason", "status", "channel_id", "channel_slug"],
    required: ["target_type", "target_id", "reason"],
    enums: {
      target_type: ["user", "message"],
      status: ["open", "resolved", "dismissed"],
    },
    rls: {
      read: { $or: [OWN, ADMIN] },
      create: OWN,
      update: ADMIN,
      delete: ADMIN,
    },
  },
  // Davet kodları: yalnızca yönetici üretir/görür; kayıt sırasında sunucu tüketir.
  Invite: {
    fields: ["code", "note", "max_uses", "used_count", "expires_at", "active"],
    required: ["code"],
    unique: ["code"],
    rls: { read: ADMIN, create: ADMIN, update: ADMIN, delete: ADMIN },
  },
  Notification: {
    fields: ["user_id", "type", "title", "body", "channel_id", "channel_slug", "read"],
    required: ["user_id", "type", "title"],
    enums: { type: ["invite", "message", "dm"] },
    rls: {
      read: { $or: [{ "data.user_id": "{{user.id}}" }, ADMIN] },
      create: ADMIN,
      update: { "data.user_id": "{{user.id}}" },
      delete: { "data.user_id": "{{user.id}}" },
    },
  },
};

function resolveValue(value, user) {
  if (value === "{{user.id}}") return user?.id ?? null;
  if (Array.isArray(value)) return value.map((item) => resolveValue(item, user));
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveValue(item, user)]));
  }
  return value;
}

// Kuralı düz bir sorguya çevir. {} → herkes, null → hiç kimse.
function resolveRule(rule, user) {
  const out = {};

  for (const [key, value] of Object.entries(rule)) {
    if (key === "user_condition") {
      if ((user?.role ?? null) !== (value?.role ?? null)) return null;
      continue;
    }

    if (key === "$or" || key === "$and") {
      const parts = value.map((sub) => resolveRule(sub, user));

      if (key === "$or") {
        if (parts.some((part) => part && Object.keys(part).length === 0)) continue; // bir dal herkese açık
        const usable = parts.filter((part) => part !== null);
        if (usable.length === 0) return null;
        out.$or = usable;
      } else {
        if (parts.some((part) => part === null)) return null;
        out.$and = parts.filter((part) => part && Object.keys(part).length > 0);
      }
      continue;
    }

    out[key.startsWith("data.") ? key.slice(5) : key] = resolveValue(value, user);
  }

  return out;
}

// Kullanıcının bu eyleme izin verildiği kayıtları seçen sorgu. Kural yoksa/anonimse hiçbiri.
export function ruleQuery(entity, action, user) {
  if (!user) return NEVER;
  const rule = ENTITIES[entity]?.rls?.[action];
  if (rule === undefined) return NEVER;

  const resolved = resolveRule(rule, user);
  return resolved === null ? NEVER : resolved;
}
