import { useCallback, useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, Loader2, Mail, UserPlus } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import {
  deleteNotificationRecord,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/kryptApi";
import { timeAgo } from "@/lib/krypt";
import { tStatic, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authed/notifications")({
  head: () => ({ meta: [{ title: tStatic("titles.notifications") }] }),
  component: NotificationsPage,
});

const ICONS = { invite: UserPlus, message: Bell, dm: Mail };

function NotificationsPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listNotifications(user.id));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function open(row) {
    if (!row.read) {
      await markNotificationRead(row.id);
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, read: true } : item)));
    }
    if (!row.channel_slug) return;
    if (row.type === "dm") navigate({ to: "/messages/$slug", params: { slug: row.channel_slug } });
    else navigate({ to: "/channels/$slug", params: { slug: row.channel_slug } });
  }

  async function remove(event, row) {
    event.stopPropagation();
    await deleteNotificationRecord(row.id);
    setRows((prev) => prev.filter((item) => item.id !== row.id));
  }

  const unread = rows.filter((row) => !row.read).length;

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mono-label flex items-center gap-2">
            <span className="signal-dot" /> {t("notifications.label")}
          </span>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.03em] text-white">
            {t("notifications.title")}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {unread > 0 ? t("notifications.unread", { count: unread }) : t("notifications.allRead")}
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={async () => {
              await markAllNotificationsRead(user.id);
              setRows((prev) => prev.map((row) => ({ ...row, read: true })));
            }}
            className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] px-3.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-neon/30 hover:text-neon"
          >
            <CheckCheck className="h-3.5 w-3.5" /> {t("notifications.markAll")}
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid place-items-center py-20">
          <Loader2 className="h-5 w-5 animate-spin text-neon" />
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {rows.map((row) => {
            const Icon = ICONS[row.type] || Bell;
            return (
              <li key={row.id} className="relative">
                <button
                  type="button"
                  onClick={() => open(row)}
                  className={
                    row.read
                      ? "flex w-full items-start gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.015] px-4 py-3 pr-14 text-left transition hover:border-white/15"
                      : "flex w-full items-start gap-3 rounded-2xl border border-neon/25 bg-neon/[0.05] px-4 py-3 pr-14 text-left transition hover:border-neon/40"
                  }
                >
                  <span
                    className={
                      row.read
                        ? "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/10 text-muted-foreground"
                        : "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-neon/30 bg-neon/[0.08] text-neon"
                    }
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] text-white">{row.title}</span>
                    {row.body && (
                      <span className="mt-0.5 block text-[12px] text-muted-foreground">{row.body}</span>
                    )}
                    <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                      {timeAgo(row.created_date, lang)}
                    </span>
                  </span>
                  {!row.read && <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-neon" />}
                </button>
                <button
                  type="button"
                  onClick={(event) => remove(event, row)}
                  aria-label={t("notifications.deleteAria")}
                  className="absolute right-3 top-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/50 transition hover:text-signal-red"
                >
                  {t("notifications.delete")}
                </button>
              </li>
            );
          })}
          {!rows.length && (
            <li className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-sm text-muted-foreground">
              {t("notifications.empty")}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}