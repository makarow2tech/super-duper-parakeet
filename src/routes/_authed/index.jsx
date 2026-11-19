import { useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, Hash, LockKeyhole, MessageSquare, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useVault } from "@/lib/VaultContext";
import { useChannels } from "@/lib/useChannels";
import { latestMessages } from "@/lib/kryptApi";
import { decryptMessage } from "@/lib/crypto";
import { timeAgo } from "@/lib/krypt";
import HandleAvatar from "@/components/krypt/HandleAvatar";
import { tStatic, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authed/")({
  validateSearch: (search) => ({ q: search.q }),
  head: () => ({
    meta: [
      { title: tStatic("titles.feed") },
      { name: "description", content: tStatic("meta.feedDescription") },
    ],
  }),
  component: FeedPage,
});

function FeedPage() {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { channelKey } = useVault();
  const { channels, memberships, loading: channelsLoading } = useChannels();
  const search = Route.useSearch();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (channelsLoading) return;
    let alive = true;
    (async () => {
      const raw = await latestMessages(50);
      const byId = new Map(channels.map((channel) => [channel.id, channel]));
      const memberByChannel = new Map(memberships.map((row) => [row.channel_id, row]));

      const keys = new Map();
      for (const channel of byId.values()) {
        const key = await channelKey(channel, memberByChannel.get(channel.id));
        if (key) keys.set(channel.id, key);
      }

      const decoded = [];
      for (const row of raw) {
        const channel = byId.get(row.channel_id);
        const key = channel && keys.get(row.channel_id);
        if (!channel || !key) continue;
        const text = await decryptMessage(row.cipher, key);
        if (!text) continue;
        decoded.push({ ...row, text, channel });
      }
      if (alive) {
        setFeed(decoded);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [channelsLoading, channels, memberships, channelKey]);

  const posts = useMemo(() => {
    const needle = String(search.q || "").trim().toLowerCase();
    if (!needle) return feed;
    return feed.filter(
      (item) =>
        item.text.toLowerCase().includes(needle) ||
        (item.author_handle || "").toLowerCase().includes(needle) ||
        (item.channel?.name || "").toLowerCase().includes(needle)
    );
  }, [feed, search.q]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[hsl(var(--card))]/60 px-6 py-7 sm:px-8">
        <div className="grid-backdrop pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative">
          <span className="mono-label flex items-center gap-2">
            <span className="signal-dot" /> {t("feed.label")}
          </span>
          <h1 className="mt-3 font-heading text-2xl font-semibold tracking-[-0.03em] text-white sm:text-[28px]">
            {t("feed.title")}
          </h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("feed.desc")}</p>

          <div className="mt-5 flex flex-wrap gap-2">
            <span className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
              <Hash className="h-3.5 w-3.5 text-neon" strokeWidth={1.8} />
              <strong className="font-mono text-sm text-white">{channels.length}</strong>
              <span className="mono-label">{t("feed.channels")}</span>
            </span>
            <span className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
              <MessageSquare className="h-3.5 w-3.5 text-signal-blue" strokeWidth={1.8} />
              <strong className="font-mono text-sm text-white">{feed.length}</strong>
              <span className="mono-label">{t("feed.messages")}</span>
            </span>
            <span className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2">
              <ShieldCheck className="h-3.5 w-3.5 text-neon-2" strokeWidth={1.8} />
              <span className="mono-label">{t("feed.e2e")}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between px-1">
        <div className="flex items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-1">
          <span className="rounded-lg bg-neon px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--primary-foreground))]">
            {t("feed.tab")}
          </span>
          <Link
            to="/channels"
            className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:text-white"
          >
            {t("feed.tabChannels")}
          </Link>
        </div>
        <Link
          to="/channels"
          className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:text-neon"
        >
          <Plus className="h-3 w-3" /> {t("feed.createChannel")}
        </Link>
      </div>

      {loading ? (
        <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {t("feed.decoding")}
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {posts.map((item) => (
            <li
              key={item.id}
              className="group rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/50 p-4 transition hover:border-neon/25 hover:bg-[hsl(var(--card))]/80 sm:p-5"
            >
              <div className="flex items-center gap-2 text-[11px]">
                <HandleAvatar name={item.author_handle || "?"} size={28} />
                <span className="font-mono text-white">@{item.author_handle || t("feed.user")}</span>
                <span className="text-muted-foreground">·</span>
                <span className="font-mono text-muted-foreground">{timeAgo(item.created_date, lang)}</span>
                <Link
                  to={item.channel.kind === "direct" ? "/messages/$slug" : "/channels/$slug"}
                  params={{ slug: item.channel.slug }}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2 py-1 font-mono text-[10px] text-muted-foreground transition hover:border-neon/30 hover:text-neon"
                >
                  {item.channel.visibility === "private" ? (
                    <LockKeyhole className="h-3 w-3 text-neon-2" strokeWidth={1.9} />
                  ) : (
                    <Hash className="h-3 w-3" strokeWidth={1.9} />
                  )}
                  {item.channel.kind === "direct" ? t("feed.directChat") : item.channel.name}
                </Link>
              </div>

              <p className="mt-3 whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-foreground/90">
                {item.text}
              </p>

              <div className="mt-4 flex items-center gap-4 border-t border-white/[0.05] pt-3">
                <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  <LockKeyhole className="h-3 w-3" /> aes-256
                </span>
                <Link
                  to={item.channel.kind === "direct" ? "/messages/$slug" : "/channels/$slug"}
                  params={{ slug: item.channel.slug }}
                  className="ml-auto flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition group-hover:text-neon"
                >
                  {item.channel.kind === "direct" ? t("feed.goChat") : t("feed.goChannel")}{" "}
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!loading && !posts.length && (
        <div className="mt-3 rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
          <p className="font-heading text-base text-white/80">
            {search.q ? t("feed.emptySearch") : t("feed.empty")}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {user?.email ? t("feed.emptyHint") : ""}
          </p>
          <Link
            to="/channels"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-neon px-3.5 py-2 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--primary-foreground))]"
          >
            <Sparkles className="h-3 w-3" /> {t("feed.goChannels")}
          </Link>
        </div>
      )}
    </div>
  );
}