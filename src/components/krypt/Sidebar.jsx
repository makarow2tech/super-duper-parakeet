import { Link } from "@tanstack/react-router";
import { Bell, Hash, House, KeyRound, LockKeyhole, LockOpen, Mail, Plus, Radio, ShieldCheck, Users } from "lucide-react";
import HandleAvatar from "@/components/krypt/HandleAvatar";
import { useChannels } from "@/lib/useChannels";
import { useVault } from "@/lib/VaultContext";
import { useLang } from "@/lib/i18n";
import { useSite } from "@/lib/SiteContext";

const NAV = [
  { to: "/", key: "nav.feed", icon: House, exact: true },
  { to: "/channels", key: "nav.channels", icon: Hash },
  { to: "/communities", key: "nav.communities", icon: Users },
  { to: "/messages", key: "nav.messages", icon: Mail },
  { to: "/notifications", key: "nav.notifications", icon: Bell },
];

export default function Sidebar({ user, onNavigate }) {
  const { t } = useLang();
  const { site_name: siteName } = useSite();
  const { channels } = useChannels();
  const { profile, locked } = useVault();
  const visible = channels.filter((channel) => channel.kind !== "direct");

  return (
    <div className="flex h-full flex-col">
      <Link to="/" onClick={onNavigate} className="flex items-center gap-3 px-5 pb-5 pt-6">
        <span className="relative grid h-10 w-10 place-items-center rounded-[14px] border border-neon/45 bg-neon/[0.07] krypt-glow">
          <span className="absolute inset-1 rounded-[9px] border border-neon/15" />
          <LockKeyhole className="relative h-4 w-4 text-neon" strokeWidth={1.8} />
        </span>
        <span className="leading-tight">
          <span className="block truncate font-heading text-lg font-bold tracking-[0.14em] text-white">
            {siteName || "KRYPT"}
            <span className="text-neon">/</span>
          </span>
          <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
            {t("common.tagline")}
          </span>
        </span>
      </Link>

      <nav className="space-y-1 px-3">
        {NAV.map(({ to, key, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            activeOptions={{ exact: !!exact }}
            className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-white/[0.04] hover:text-white"
            activeProps={{
              className:
                "group flex items-center gap-3 rounded-xl border border-neon/25 bg-neon/[0.07] px-3 py-2.5 text-sm text-neon",
            }}
          >
            <Icon className="h-[17px] w-[17px]" strokeWidth={1.8} />
            <span className="font-medium">{t(key)}</span>
          </Link>
        ))}
      </nav>

      {user?.role === "admin" && (
        <div className="mt-3 px-3">
          <Link
            to="/admin"
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-xl border border-signal-yellow/25 bg-signal-yellow/[0.06] px-3 py-2.5 text-sm text-signal-yellow transition hover:bg-signal-yellow/[0.1]"
          >
            <ShieldCheck className="h-[17px] w-[17px]" strokeWidth={1.8} />
            <span className="font-medium">{t("nav.admin")}</span>
          </Link>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between px-5">
        <span className="mono-label">{t("sidebar.channels")}</span>
        <Link
          to="/channels"
          onClick={onNavigate}
          className="grid h-6 w-6 place-items-center rounded-md border border-white/10 text-muted-foreground transition hover:border-neon/40 hover:text-neon"
          aria-label={t("sidebar.createChannel")}
        >
          <Plus className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
        <ul className="space-y-0.5">
          {visible.slice(0, 20).map((channel) => (
            <li key={channel.id}>
              <Link
                to="/channels/$slug"
                params={{ slug: channel.slug }}
                onClick={onNavigate}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition hover:bg-white/[0.04] hover:text-white"
              >
                {channel.visibility === "private" ? (
                  <LockKeyhole className="h-3.5 w-3.5 shrink-0 text-neon-2/80" strokeWidth={1.8} />
                ) : (
                  <Hash className="h-3.5 w-3.5 shrink-0 opacity-60" strokeWidth={1.8} />
                )}
                <span className="truncate">{channel.name}</span>
              </Link>
            </li>
          ))}
          {!visible.length && (
            <li className="px-3 py-2 font-mono text-[11px] text-muted-foreground/60">
              {t("sidebar.loadingChannels")}
            </li>
          )}
        </ul>
      </div>

      <div className="border-t border-white/[0.06] px-3 py-3">
        <Link
          to="/settings"
          onClick={onNavigate}
          className="mb-2 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition hover:border-neon/25"
        >
          <span className="flex items-center gap-2">
            <KeyRound className="h-3.5 w-3.5 text-neon" strokeWidth={1.8} />
            <span className="mono-label">{t("sidebar.vault")}</span>
          </span>
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
        </Link>
        <div className="flex items-center gap-2.5 rounded-xl px-2 py-1.5">
          <HandleAvatar name={profile?.handle || user?.full_name || user?.email} size={32} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-white">
              {profile?.display_name || user?.full_name || t("common.user")}
            </p>
            <p className="truncate font-mono text-[10px] text-muted-foreground">
              {profile?.handle ? `@${profile.handle}` : user?.email}
            </p>
          </div>
          <Radio className="ml-auto h-3 w-3 text-neon/60" />
        </div>
      </div>
    </div>
  );
}