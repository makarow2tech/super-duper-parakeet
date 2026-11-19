import { useCallback, useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Hash, Loader2, Plus, Users } from "lucide-react";
import { getCommunityBySlug, listCommunityChannels } from "@/lib/kryptApi";
import ChannelCard from "@/components/krypt/ChannelCard";
import CreateChannelDialog from "@/components/krypt/CreateChannelDialog";
import { tStatic, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authed/communities/$slug")({
  head: () => ({ meta: [{ title: tStatic("titles.community") }] }),
  component: CommunityPage,
});

function CommunityPage() {
  const { t } = useLang();
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [community, setCommunity] = useState(null);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const found = await getCommunityBySlug(slug);
      setCommunity(found);
      setChannels(found ? await listCommunityChannels(found.id) : []);
    } finally {
      setLoading(false);
    }
  }, [slug]);

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

  if (!community) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 px-6 py-10 text-center">
        <Users className="mx-auto h-5 w-5 text-neon" />
        <p className="mt-3 text-sm text-white">{t("community.notFound")}</p>
        <Link to="/communities" className="mt-4 inline-block font-mono text-[10.5px] uppercase tracking-wider text-neon">
          {t("community.back")}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/communities"
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] text-muted-foreground transition hover:border-neon/30 hover:text-neon"
            aria-label={t("community.backAria")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </Link>
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-neon/25 bg-neon/[0.07] text-neon">
            <Users className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-heading text-lg font-semibold tracking-[-0.02em] text-white">
              {community.name}
            </h1>
            <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>c/{community.slug}</span>
              <span className="text-muted-foreground/50">·</span>
              <span className="flex items-center gap-1">
                <Hash className="h-2.5 w-2.5" /> {channels.length} {t("communities.channels")}
              </span>
              {community.owner_handle && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span>@{community.owner_handle}</span>
                </>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setOpen(true)}
            className="ml-auto flex h-9 items-center gap-1.5 rounded-xl bg-neon px-3 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90"
          >
            <Plus className="h-3.5 w-3.5" /> {t("community.newChannel")}
          </button>
        </div>

        {community.description && (
          <p className="mt-3 border-t border-white/[0.05] pt-3 text-[13px] text-muted-foreground">
            {community.description}
          </p>
        )}
      </div>

      <section className="mt-4 grid gap-3 sm:grid-cols-2">
        {channels.map((channel) => (
          <ChannelCard key={channel.id} channel={channel} />
        ))}
        {!channels.length && (
          <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted-foreground sm:col-span-2">
            {t("community.emptyChannels")}
          </p>
        )}
      </section>

      <CreateChannelDialog
        open={open}
        onOpenChange={setOpen}
        community={community}
        onCreated={(channel) => {
          load();
          navigate({ to: "/channels/$slug", params: { slug: channel.slug } });
        }}
      />
    </div>
  );
}
