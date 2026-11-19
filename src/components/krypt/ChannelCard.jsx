import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Hash, LockKeyhole, Users } from "lucide-react";
import { useLang } from "@/lib/i18n";

export default function ChannelCard({ channel }) {
  const { t } = useLang();
  const isPrivate = channel.visibility === "private";
  return (
    <Link
      to="/channels/$slug"
      params={{ slug: channel.slug }}
      className="group flex flex-col rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/50 p-4 transition hover:border-neon/25 hover:bg-[hsl(var(--card))]/80"
    >
      <div className="flex items-center gap-2">
        <span
          className={
            isPrivate
              ? "grid h-8 w-8 place-items-center rounded-xl border border-neon-2/30 bg-neon-2/[0.08] text-neon-2"
              : "grid h-8 w-8 place-items-center rounded-xl border border-neon/25 bg-neon/[0.07] text-neon"
          }
        >
          {isPrivate ? <LockKeyhole className="h-3.5 w-3.5" /> : <Hash className="h-3.5 w-3.5" />}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-medium text-white">{channel.name}</p>
          <p className="truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {channel.community_name
              ? `${t("channel.community")} · ${channel.community_name}`
              : channel.kind === "general"
                ? t("channel.general")
                : isPrivate
                  ? t("channel.privateInvite")
                  : t("channel.public")}
          </p>
        </div>
        <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/60 transition group-hover:text-neon" />
      </div>

      {channel.description && (
        <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">{channel.description}</p>
      )}

      <div className="mt-3 flex items-center gap-3 border-t border-white/[0.05] pt-2.5">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <Users className="h-3 w-3" /> {(channel.members || []).length} {t("channel.members")}
        </span>
        {channel.owner_handle && (
          <span className="font-mono text-[10px] text-muted-foreground/70">@{channel.owner_handle}</span>
        )}
      </div>
    </Link>
  );
}