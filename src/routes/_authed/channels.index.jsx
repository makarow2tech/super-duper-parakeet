import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Hash, LockKeyhole, Plus } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useChannels } from "@/lib/useChannels";
import ChannelCard from "@/components/krypt/ChannelCard";
import CreateChannelDialog from "@/components/krypt/CreateChannelDialog";
import { tStatic, useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authed/channels/")({
  head: () => ({ meta: [{ title: tStatic("titles.channels") }] }),
  component: ChannelsPage,
});

function ChannelsPage() {
  const { t } = useLang();
  const { user } = useAuth();
  const { channels, loading, refresh } = useChannels();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const publics = channels.filter((channel) => channel.visibility === "public" && channel.kind !== "direct");
  const privates = channels.filter(
    (channel) =>
      channel.visibility === "private" && channel.kind !== "direct" && (channel.members || []).includes(user?.id)
  );

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="mono-label flex items-center gap-2">
            <span className="signal-dot" /> {t("channels.label")}
          </span>
          <h1 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.03em] text-white">
            {t("channels.title")}
          </h1>
          <p className="mt-1.5 max-w-lg text-sm text-muted-foreground">{t("channels.desc")}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-10 items-center gap-2 rounded-xl bg-neon px-4 font-mono text-[10.5px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90"
        >
          <Plus className="h-3.5 w-3.5" /> {t("channels.new")}
        </button>
      </div>

      <section className="mt-7">
        <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neon">
          <Hash className="h-3.5 w-3.5" /> {t("channels.public")}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {publics.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
          {!loading && !publics.length && (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted-foreground sm:col-span-2">
              {t("channels.emptyPublic")}
            </p>
          )}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neon-2">
          <LockKeyhole className="h-3.5 w-3.5" /> {t("channels.private")}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {privates.map((channel) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
          {!loading && !privates.length && (
            <p className="rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted-foreground sm:col-span-2">
              {t("channels.emptyPrivate")}
            </p>
          )}
        </div>
      </section>

      <CreateChannelDialog
        open={open}
        onOpenChange={setOpen}
        onCreated={(channel) => {
          refresh();
          navigate({ to: "/channels/$slug", params: { slug: channel.slug } });
        }}
      />
    </div>
  );
}