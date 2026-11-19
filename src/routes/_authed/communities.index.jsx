import { useCallback, useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Hash, Loader2, Plus, Users } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { listAccessibleChannels, listCommunities } from "@/lib/kryptApi";
import CreateCommunityDialog from "@/components/krypt/CreateCommunityDialog";
import { tStatic, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authed/communities/")({
  head: () => ({ meta: [{ title: tStatic("titles.communities") }] }),
  component: CommunitiesPage,
});

function CommunitiesPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const [rows, accessible] = await Promise.all([listCommunities(), listAccessibleChannels(user.id)]);
      setCommunities(rows);
      setChannels(accessible.filter((channel) => channel.kind !== "direct"));
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const countFor = (communityId) => channels.filter((channel) => channel.community_id === communityId).length;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mono-label flex items-center gap-2">
            <span className="signal-dot" /> {t("communities.label")}
          </span>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.03em] text-white">
            {t("communities.title")}
          </h1>
          <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">{t("communities.desc")}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 items-center gap-2 rounded-xl bg-neon px-4 font-mono text-[10.5px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90"
        >
          <Plus className="h-3.5 w-3.5" /> {t("communities.new")}
        </button>
      </div>

      <section className="mt-7">
        <div className="grid gap-3 sm:grid-cols-2">
          {loading && (
            <div className="grid place-items-center py-12 sm:col-span-2">
              <Loader2 className="h-5 w-5 animate-spin text-neon" />
            </div>
          )}

          {!loading &&
            communities.map((community) => (
              <Link
                key={community.id}
                to="/communities/$slug"
                params={{ slug: community.slug }}
                className="group flex flex-col rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/50 p-4 transition hover:border-neon/25 hover:bg-[hsl(var(--card))]/80"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 place-items-center rounded-xl border border-neon/25 bg-neon/[0.07] text-neon">
                    <Users className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-white">{community.name}</p>
                    <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                      c/{community.slug}
                    </p>
                  </div>
                  <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/60 transition group-hover:text-neon" />
                </div>

                {community.description && (
                  <p className="mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground">
                    {community.description}
                  </p>
                )}

                <div className="mt-3 flex items-center gap-3 border-t border-white/[0.05] pt-2.5">
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Hash className="h-3 w-3" /> {countFor(community.id)} {t("communities.channels")}
                  </span>
                  {community.owner_handle && (
                    <span className="font-mono text-[10px] text-muted-foreground/70">@{community.owner_handle}</span>
                  )}
                </div>
              </Link>
            ))}

          {!loading && !communities.length && (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted-foreground sm:col-span-2">
              {t("communities.empty")}
            </p>
          )}
        </div>
      </section>

      <CreateCommunityDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={(community) => {
          load();
          navigate({ to: "/communities/$slug", params: { slug: community.slug } });
        }}
      />
    </div>
  );
}
