import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { LockKeyhole, MessageSquarePlus } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useChannels } from "@/lib/useChannels";
import { useVault } from "@/lib/VaultContext";
import HandleAvatar from "@/components/krypt/HandleAvatar";
import NewChatDialog from "@/components/krypt/NewChatDialog";
import { tStatic, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authed/messages/")({
  head: () => ({ meta: [{ title: tStatic("titles.messages") }] }),
  component: MessagesPage,
});

function otherHandle(channel, myHandle, fallback = "sohbet") {
  const parts = String(channel.name || "")
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.find((part) => part !== myHandle) || parts[0] || fallback;
}

function MessagesPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const { profile } = useVault();
  const { channels, loading } = useChannels();
  const [open, setOpen] = useState(false);

  const dms = channels.filter((channel) => channel.kind === "direct" && (channel.members || []).includes(user?.id));

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mono-label flex items-center gap-2">
            <span className="signal-dot" /> {t("messages.label")}
          </span>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.03em] text-white">
            {t("messages.title")}
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{t("messages.desc")}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 items-center gap-2 rounded-xl bg-neon px-4 font-mono text-[10.5px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" /> {t("messages.new")}
        </button>
      </div>

      <ul className="mt-6 space-y-2">
        {dms.map((channel) => (
          <li key={channel.id}>
            <Link
              to="/messages/$slug"
              params={{ slug: channel.slug }}
              className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/50 px-4 py-3 transition hover:border-neon/25 hover:bg-[hsl(var(--card))]/80"
            >
              <HandleAvatar name={otherHandle(channel, profile?.handle, t("messages.chat"))} size={36} />
              <div className="min-w-0">
                <p className="truncate font-mono text-[13px] text-white">
                  @{otherHandle(channel, profile?.handle, t("messages.chat"))}
                </p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t("messages.privateChat")}
                </p>
              </div>
              <LockKeyhole className="ml-auto h-3.5 w-3.5 text-neon-2/70" />
            </Link>
          </li>
        ))}
        {!loading && !dms.length && (
          <li className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center">
            <p className="text-sm text-white/80">{t("messages.emptyTitle")}</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">{t("messages.emptyHint")}</p>
          </li>
        )}
      </ul>

      <NewChatDialog open={open} onOpenChange={setOpen} />
    </div>
  );
}