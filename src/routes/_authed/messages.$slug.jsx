import { useCallback, useEffect, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Loader2, LockKeyhole } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getChannelBySlug, getMyMembership } from "@/lib/kryptApi";
import { useVault } from "@/lib/VaultContext";
import ChannelThread from "@/components/krypt/ChannelThread";
import HandleAvatar from "@/components/krypt/HandleAvatar";
import { tStatic, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authed/messages/$slug")({
  head: () => ({ meta: [{ title: tStatic("titles.chat") }] }),
  component: ChatPage,
});

function ChatPage() {
  const { t } = useLang();
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const { profile } = useVault();
  const [channel, setChannel] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const found = await getChannelBySlug(slug);
      setChannel(found);
      if (found) setMembership(await getMyMembership(found.id, user.id));
    } finally {
      setLoading(false);
    }
  }, [slug, user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-neon" />
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 px-6 py-10 text-center">
        <LockKeyhole className="mx-auto h-5 w-5 text-neon-2" />
        <p className="mt-3 text-sm text-white">{t("messages.notFound")}</p>
        <Link to="/messages" className="mt-4 inline-block font-mono text-[10.5px] uppercase tracking-wider text-neon">
          {t("messages.back")}
        </Link>
      </div>
    );
  }

  const other =
    String(channel.name || "")
      .split("·")
      .map((part) => part.trim())
      .find((part) => part && part !== profile?.handle) || t("messages.chat");

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-4">
        <Link
          to="/messages"
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] text-muted-foreground transition hover:border-neon/30 hover:text-neon"
          aria-label={t("messages.backAria")}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
        </Link>
        <HandleAvatar name={other} size={34} />
        <div>
          <h1 className="font-mono text-[14px] text-white">@{other}</h1>
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <LockKeyhole className="h-2.5 w-2.5 text-neon-2" /> {t("messages.e2eChat")}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <ChannelThread channel={channel} membership={membership} direct />
      </div>
    </div>
  );
}