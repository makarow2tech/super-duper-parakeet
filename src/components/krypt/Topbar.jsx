import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, LogOut, Menu, Plus, Search, Settings } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import HandleAvatar from "@/components/krypt/HandleAvatar";
import { useAuth } from "@/lib/AuthContext";
import { useUnreadNotifications } from "@/lib/useChannels";
import { useVault } from "@/lib/VaultContext";
import { useLang } from "@/lib/i18n";
import LanguageToggle from "@/components/krypt/LanguageToggle";

export default function Topbar({ user, onOpenMenu }) {
  const { t } = useLang();
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { profile } = useVault();
  const unread = useUnreadNotifications();
  const [query, setQuery] = useState("");

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.07] border-t-2 border-t-neon/70 bg-[hsl(var(--background))]/90 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onOpenMenu}
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-muted-foreground lg:hidden"
          aria-label={t("topbar.menu")}
        >
          <Menu className="h-4 w-4" />
        </button>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            navigate({ to: "/", search: { q: query.trim() || undefined } });
          }}
          className="relative flex-1 sm:max-w-sm"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("topbar.search")}
            aria-label={t("topbar.searchAria")}
            className="h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] pl-9 pr-3 font-mono text-[11px] text-white outline-none transition placeholder:text-muted-foreground/70 focus:border-neon/40"
          />
        </form>

        <div className="ml-auto flex items-center gap-1.5">
          <LanguageToggle className="mr-1" />
          <Link
            to="/channels"
            className="hidden h-9 items-center gap-1.5 rounded-xl bg-neon px-3.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 sm:flex"
          >
            <Plus className="h-3.5 w-3.5" /> {t("topbar.channel")}
          </Link>
          <Link
            to="/notifications"
            className="relative grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] text-muted-foreground transition hover:border-neon/30 hover:text-neon"
            aria-label={t("topbar.notifications")}
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-neon-2 px-1 font-mono text-[9px] font-medium text-black">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Link
            to="/settings"
            className="hidden h-9 w-9 place-items-center rounded-xl border border-white/[0.08] text-muted-foreground transition hover:border-neon/30 hover:text-neon sm:grid"
            aria-label={t("topbar.settings")}
          >
            <Settings className="h-4 w-4" />
          </Link>
          <div className="ml-1 hidden items-center gap-2 md:flex">
            <HandleAvatar name={profile?.handle || user?.full_name || user?.email} size={32} />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logout()}
              className="h-9 rounded-xl border border-white/[0.08] px-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-white"
              aria-label={t("topbar.logout")}
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}