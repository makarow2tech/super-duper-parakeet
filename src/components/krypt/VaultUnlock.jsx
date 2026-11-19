import { useState } from "react";
import { Fingerprint, LockKeyhole, Unlock } from "lucide-react";
import { useVault } from "@/lib/VaultContext";
import { useLang } from "@/lib/i18n";

export default function VaultUnlock() {
  const { t } = useLang();
  const { unlock, profile, vault } = useVault();
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await unlock(passphrase);
      setPassphrase("");
    } catch (err) {
      setError(
        err?.code === "BAD_PASSPHRASE" ? t("vault.errBadPass") : err?.message || t("vault.errUnlock")
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[hsl(var(--card))]/70 p-6 sm:p-8">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-30" />
        <div className="relative">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-neon-2/40 bg-neon-2/[0.08]">
            <LockKeyhole className="h-5 w-5 text-neon-2" strokeWidth={1.8} />
          </span>
          <h1 className="mt-5 font-heading text-xl font-semibold tracking-[-0.02em] text-white">
            {t("vault.lockedTitle")}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("vault.lockedDesc")}</p>

          {profile?.handle && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 font-mono text-[11px] text-white">
              <span className="text-neon">@</span>
              {profile.handle}
            </p>
          )}

          <form onSubmit={submit} className="mt-5 space-y-3">
            <input
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              placeholder={t("vault.passphrasePlaceholderShort")}
              autoComplete="current-password"
              autoFocus
              className="h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40 placeholder:text-muted-foreground/60"
            />
            {error && (
              <p className="rounded-xl border border-signal-red/30 bg-signal-red/[0.07] px-3 py-2 text-[12px] text-signal-red">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy || !passphrase}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neon font-mono text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 disabled:opacity-50"
            >
              <Unlock className="h-4 w-4" /> {busy ? t("vault.unlocking") : t("vault.unlock")}
            </button>
          </form>

          {vault?.fingerprint && (
            <p className="mt-4 flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-muted-foreground/70">
              <Fingerprint className="h-3 w-3" /> {vault.fingerprint}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}