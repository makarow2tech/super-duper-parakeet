import { useState } from "react";
import { Fingerprint, KeyRound, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { normalizeHandle } from "@/lib/krypt";
import { handleTaken } from "@/lib/kryptApi";
import { useVault } from "@/lib/VaultContext";
import { useLang } from "@/lib/i18n";

export default function VaultSetup() {
  const { t } = useLang();
  const { setup } = useVault();
  const [form, setForm] = useState({ handle: "", displayName: "", passphrase: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const update = (field) => (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError("");
    const handle = normalizeHandle(form.handle);
    if (handle.length < 3) return setError(t("vault.errHandleShort"));
    if (form.passphrase.length < 8) return setError(t("vault.errPassShort"));
    if (form.passphrase !== form.confirm) return setError(t("vault.errMismatch"));

    setBusy(true);
    try {
      if (await handleTaken(handle)) {
        setError(t("vault.errTaken"));
        return;
      }
      await setup({ handle, displayName: form.displayName.trim() || handle, passphrase: form.passphrase });
      toast.success(t("vault.created"));
    } catch (err) {
      setError(err?.message || t("vault.errCreate"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[hsl(var(--card))]/70 p-6 sm:p-8">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-neon/40 bg-neon/[0.08] krypt-glow">
            <KeyRound className="h-5 w-5 text-neon" strokeWidth={1.8} />
          </span>
          <h1 className="mt-5 font-heading text-xl font-semibold tracking-[-0.02em] text-white">
            {t("vault.setupTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("vault.setupDesc")}</p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            <label className="block">
              <span className="mono-label">{t("vault.handle")}</span>
              <div className="mt-1.5 flex items-center rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 focus-within:border-neon/40">
                <span className="font-mono text-sm text-neon">@</span>
                <input
                  value={form.handle}
                  onChange={update("handle")}
                  placeholder={t("vault.handlePlaceholder")}
                  autoComplete="username"
                  className="h-10 w-full bg-transparent px-2 font-mono text-sm text-white outline-none placeholder:text-muted-foreground/60"
                />
              </div>
            </label>

            <label className="block">
              <span className="mono-label">{t("vault.displayName")}</span>
              <input
                value={form.displayName}
                onChange={update("displayName")}
                placeholder={t("vault.displayPlaceholder")}
                className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40 placeholder:text-muted-foreground/60"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mono-label">{t("vault.passphrase")}</span>
                <input
                  type="password"
                  value={form.passphrase}
                  onChange={update("passphrase")}
                  autoComplete="new-password"
                  placeholder={t("vault.passphrasePlaceholder")}
                  className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40 placeholder:text-muted-foreground/60"
                />
              </label>
              <label className="block">
                <span className="mono-label">{t("vault.confirm")}</span>
                <input
                  type="password"
                  value={form.confirm}
                  onChange={update("confirm")}
                  autoComplete="new-password"
                  placeholder={t("vault.confirmPlaceholder")}
                  className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40 placeholder:text-muted-foreground/60"
                />
              </label>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-signal-yellow/25 bg-signal-yellow/[0.06] px-3 py-2.5">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-yellow" />
              <p className="text-[11.5px] leading-relaxed text-signal-yellow/90">{t("vault.warning")}</p>
            </div>

            {error && (
              <p className="rounded-xl border border-signal-red/30 bg-signal-red/[0.07] px-3 py-2 text-[12px] text-signal-red">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neon font-mono text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 disabled:opacity-60"
            >
              <LockKeyhole className="h-4 w-4" />
              {busy ? t("vault.creating") : t("vault.create")}
            </button>
          </form>

          <p className="mt-4 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
            <Fingerprint className="h-3 w-3" /> RSA-4096 · AES-256-GCM · PBKDF2
          </p>
        </div>
      </div>
    </div>
  );
}