// Mongo benzeri sorgu dili: eşitlik, $or/$and, $in/$nin/$ne/$gt/$gte/$lt/$lte/$exists.
// Dizi alanlarında `members: "x"` eşitliği "dizide x var mı" demektir (Mongo ile aynı).

export const NEVER = { id: { $in: [] } };

const COMPARATORS = {
  $gt: (a, b) => a > b,
  $gte: (a, b) => a >= b,
  $lt: (a, b) => a < b,
  $lte: (a, b) => a <= b,
};

function eq(value, want) {
  if (Array.isArray(value) && !Array.isArray(want)) return value.includes(want);
  return value === want;
}

function fieldMatches(value, condition) {
  const keys = condition && typeof condition === "object" && !Array.isArray(condition) ? Object.keys(condition) : null;

  if (keys && keys.length > 0 && keys.every((key) => key.startsWith("$"))) {
    for (const [op, arg] of Object.entries(condition)) {
      if (!(op in COMPARATORS) && op !== "$in" && op !== "$nin" && op !== "$ne" && op !== "$exists") {
        throw new Error(`Desteklenmeyen operatör: ${op}`);
      }

      let ok;
      switch (op) {
        case "$in":
          ok = (Array.isArray(arg) ? arg : []).some((item) => eq(value, item));
          break;
        case "$nin":
          ok = !(Array.isArray(arg) ? arg : []).some((item) => eq(value, item));
          break;
        case "$ne":
          ok = !eq(value, arg);
          break;
        case "$exists":
          ok = (value !== undefined && value !== null) === Boolean(arg);
          break;
        default:
          try {
            ok = Boolean(COMPARATORS[op](value, arg));
          } catch {
            ok = false;
          }
      }

      if (!ok) return false;
    }
    return true;
  }

  return eq(value, condition);
}

export function matches(doc, query) {
  for (const [key, condition] of Object.entries(query || {})) {
    if (key === "$or") {
      if (!condition.some((sub) => matches(doc, sub))) return false;
    } else if (key === "$and") {
      if (!condition.every((sub) => matches(doc, sub))) return false;
    } else if (key.startsWith("$")) {
      throw new Error(`Desteklenmeyen operatör: ${key}`);
    } else if (!fieldMatches(doc?.[key], condition)) {
      return false;
    }
  }
  return true;
}

const ALLOWED = new Set(["$or", "$and", "$in", "$nin", "$ne", "$gt", "$gte", "$lt", "$lte", "$exists"]);

// İstemciden gelen sorguyu doğrula: ham operatör enjeksiyonu ($where vb.) kapalı.
export function validateQuery(query, depth = 0) {
  if (depth > 6) throw new Error("Sorgu çok derin");

  if (Array.isArray(query)) {
    for (const item of query) validateQuery(item, depth + 1);
    return;
  }

  if (query && typeof query === "object") {
    for (const [key, value] of Object.entries(query)) {
      if (key.startsWith("$") && !ALLOWED.has(key)) {
        throw new Error(`Desteklenmeyen operatör: ${key}`);
      }
      validateQuery(value, depth + 1);
    }
  }
}

// `-created_date` / `created_date` sıralaması (boş değerler en sona).
export function sortDocs(docs, sort = "-created_date") {
  const spec = sort || "-created_date";
  const desc = spec.startsWith("-");
  const field = spec.replace(/^[-+]/, "");

  return [...docs].sort((a, b) => {
    const av = a?.[field];
    const bv = b?.[field];
    if (av === undefined || av === null) return bv === undefined || bv === null ? 0 : 1;
    if (bv === undefined || bv === null) return -1;
    if (av === bv) return 0;
    return (av < bv ? -1 : 1) * (desc ? -1 : 1);
  });
}
