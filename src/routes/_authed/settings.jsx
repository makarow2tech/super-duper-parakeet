import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Fingerprint, KeyRound, Loader2, LockKeyhole, LockOpen, LogOut, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useVault } from "@/lib/VaultContext";
import { updateProfile } from "@/lib/kryptApi";
import HandleAvatar from "@/components/krypt/HandleAvatar";
import LanguageToggle from "@/components/krypt/LanguageToggle";
import { tStatic, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authed/settings")({
  head: () => ({ meta: [{ title: tStatic("titles.settings") }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t } = useLang();
  const { user, logout } = useAuth();
  const { profile, vault, locked, lock, reload } = useVault();
  const [displayName, setDisplayName] = useState(profile?.display_name || "");
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!profile) return;
    setBusy(true);
    try {
      await updateProfile(profile.id, { display_name: displayName.trim() || profile.handle });
      await reload();
      toast.success(t("settings.updated"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3">
      <div>
        <span className="mono-label flex items-center gap-2">
          <span className="signal-dot" /> {t("settings.label")}
        </span>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.03em] text-white">
          {t("settings.title")}
        </h1>
      </div>

      <section className="rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-5">
        <div className="flex items-center gap-3">
          <HandleAvatar name={profile?.handle || user?.email} size={44} />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium text-white">
              {profile?.display_name || user?.full_name || t("common.user")}
            </p>
            <p className="truncate font-mono text-[11px] text-muted-foreground">
              @{profile?.handle || "—"} · {user?.email}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <label className="block">
            <span className="mono-label">{t("settings.displayName")}</span>
            <div className="mt-1.5 flex gap-2">
              <input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                className="h-10 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40"
              />
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="flex h-10 items-center gap-2 rounded-xl bg-neon px-4 font-mono text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {t("settings.save")}
              </button>
            </div>
          </label>
        </div>
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-5">
        <div>
          <h2 className="mono-label">{t("settings.language")}</h2>
          <p className="mt-1.5 text-[12.5px] text-muted-foreground">{t("settings.languageDesc")}</p>
        </div>
        <LanguageToggle />
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neon">
            <KeyRound className="h-3.5 w-3.5" /> {t("settings.vault")}
          </h2>
          <span
            className={
              locked
                ? "flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-yellow"
                : "flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neon"
            }
          >
            {locked ? <LockKeyhole className="h-3 w-3" /> : <LockOpen className="h-3 w-3" />}
            {locked ? t("common.locked") : t("common.open")}
          </span>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">{t("settings.vaultDesc")}</p>

        {vault?.fingerprint && (
          <p className="mt-3 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-mono text-[10.5px] tracking-wider text-muted-foreground">
            <Fingerprint className="h-3 w-3 text-neon" /> {vault.fingerprint}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {!locked && (
            <button
              type="button"
              onClick={() => {
                lock();
                toast.success(t("settings.vaultLocked"));
              }}
              className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] px-3.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-signal-yellow/40 hover:text-signal-yellow"
            >
              <LockKeyhole className="h-3.5 w-3.5" /> {t("settings.lockVault")}
            </button>
          )}
          <button
            type="button"
            onClick={() => logout()}
            className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] px-3.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-signal-red/40 hover:text-signal-red"
          >
            <LogOut className="h-3.5 w-3.5" /> {t("settings.logout")}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/40 p-5">
        <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-neon" /> {t("settings.encryption")}
        </h2>
        <ul className="mt-3 space-y-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground">
          <li>{t("settings.enc1")}</li>
          <li>{t("settings.enc2")}</li>
          <li>{t("settings.enc3")}</li>
          <li>{t("settings.enc4")}</li>
          <li>{t("settings.enc5")}</li>
        </ul>
      </section>

    </div>
  );
}