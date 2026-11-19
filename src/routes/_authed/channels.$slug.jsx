import { useCallback, useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Hash, Loader2, LockKeyhole, LogOut, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import {
  deleteChannelMember,
  getChannelBySlug,
  getMyMembership,
  updateChannel,
} from "@/lib/kryptApi";
import ChannelThread from "@/components/krypt/ChannelThread";
import InviteDialog from "@/components/krypt/InviteDialog";
import { tStatic, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authed/channels/$slug")({
  head: () => ({ meta: [{ title: tStatic("titles.channel") }] }),
  component: ChannelPage,
});

function ChannelPage() {
  const { t } = useLang();
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [channel, setChannel] = useState(null);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);

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

  async function leave() {
    if (!channel || !membership) return;
    await deleteChannelMember(membership.id);
    await updateChannel(channel.id, {
      members: (channel.members || []).filter((id) => id !== user.id),
    });
    toast.success(t("channel.left"));
    navigate({ to: "/channels" });
  }

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
        <p className="mt-3 text-sm text-white">{t("channel.notFound")}</p>
        <Link to="/channels" className="mt-4 inline-block font-mono text-[10.5px] uppercase tracking-wider text-neon">
          {t("channel.back")}
        </Link>
      </div>
    );
  }

  const isPrivate = channel.visibility === "private";
  const isOwner = channel.owner_id === user?.id;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/channels"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] text-muted-foreground transition hover:border-neon/30 hover:text-neon"
            aria-label={t("channel.backAria")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <span
            className={
              isPrivate
                ? "grid h-9 w-9 place-items-center rounded-xl border border-neon-2/30 bg-neon-2/[0.08] text-neon-2"
                : "grid h-9 w-9 place-items-center rounded-xl border border-neon/25 bg-neon/[0.07] text-neon"
            }
          >
            {isPrivate ? <LockKeyhole className="h-4 w-4" /> : <Hash className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-lg font-semibold tracking-[-0.02em] text-white">
              {channel.name}
            </h1>
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-2.5 w-2.5" /> {(channel.members || []).length} {t("channel.members")}
              </span>
              <span className="text-muted-foreground/50">·</span>
              <span>{isPrivate ? t("channel.privateE2e") : t("channel.public")}</span>
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {isPrivate && (
              <button
                type="button"
                onClick={() => setInviteOpen(true)}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-neon/30 bg-neon/[0.07] px-3 font-mono text-[10px] uppercase tracking-wider text-neon transition hover:bg-neon/[0.12]"
              >
                <UserPlus className="h-3.5 w-3.5" /> {t("channel.invite")}
              </button>
            )}
            {isPrivate && membership && !isOwner && (
              <button
                type="button"
                onClick={leave}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-signal-red/40 hover:text-signal-red"
              >
                <LogOut className="h-3.5 w-3.5" /> {t("channel.leave")}
              </button>
            )}
          </div>
        </div>
        {channel.community_slug && (
          <Link
            to="/communities/$slug"
            params={{ slug: channel.community_slug }}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-neon/25 bg-neon/[0.06] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-neon transition hover:bg-neon/[0.12]"
          >
            <Users className="h-3 w-3" /> {t("channel.community")}: {channel.community_name || channel.community_slug}
          </Link>
        )}
        {channel.description && (
          <p className="mt-3 border-t border-white/[0.05] pt-3 text-[13px] text-muted-foreground">{channel.description}</p>
        )}
      </div>

      <div className="mt-3">
        <ChannelThread channel={channel} membership={membership} />
      </div>

      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} channel={channel} onInvited={load} />
    </div>
  );
}