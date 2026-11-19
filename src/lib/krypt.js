const PALETTE = [
  "hsl(145 100% 55%)",
  "hsl(321 100% 65%)",
  "hsl(211 100% 67%)",
  "hsl(47 100% 62%)",
  "hsl(265 90% 70%)",
  "hsl(174 85% 55%)",
];

export function initials(name) {
  const clean = String(name || "?").replace(/^@/, "").trim();
  if (!clean) return "?";
  const parts = clean.split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export function handleColor(name) {
  let hash = 0;
  const text = String(name || "krypt");
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) % 9973;
  return PALETTE[hash % PALETTE.length];
}

export function slugify(text) {
  const map = { ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u", İ: "i" };
  return String(text || "")
    .toLowerCase()
    .replace(/[çğıöşü]/g, (ch) => map[ch] || ch)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function normalizeHandle(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/^@/, "")
    .replace(/[^a-z0-9._-]/g, "")
    .slice(0, 24);
}

const TIME_LABELS = {
  tr: { now: "şimdi", locale: "tr-TR", minutes: (n) => `${n} dk`, hours: (n) => `${n} sa`, days: (n) => `${n} gün` },
  en: { now: "now", locale: "en-US", minutes: (n) => `${n}m`, hours: (n) => `${n}h`, days: (n) => `${n}d` },
};

export function timeAgo(value, lang = "tr") {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "";
  const labels = TIME_LABELS[lang] || TIME_LABELS.tr;
  const diff = Math.max(0, Date.now() - then);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return labels.now;
  if (minutes < 60) return labels.minutes(minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return labels.hours(hours);
  const days = Math.floor(hours / 24);
  if (days < 7) return labels.days(days);
  return new Date(then).toLocaleDateString(labels.locale, { day: "2-digit", month: "short" });
}

export function timeStamp(value, lang = "tr") {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString(lang === "en" ? "en-US" : "tr-TR", { hour: "2-digit", minute: "2-digit" });
}