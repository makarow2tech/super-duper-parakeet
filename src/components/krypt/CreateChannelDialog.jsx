import { useEffect, useState } from "react";
import { Hash, Loader2, LockKeyhole, Users } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { useVault } from "@/lib/VaultContext";
import {
  addChannelMember,
  createChannelRecord,
  getChannelBySlug,
  listCommunities,
} from "@/lib/kryptApi";
import { slugify } from "@/lib/krypt";
import { useLang } from "@/lib/i18n";

export default function CreateChannelDialog({ open, onOpenChange, onCreated, community = null }) {
  const { t } = useLang();
  const { user } = useAuth();
  const { profile, newKey, wrapFor } = useVault();
  const [form, setForm] = useState({ name: "", description: "", visibility: "public", communityId: "" });
  const [communities, setCommunities] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || community) return;
    let alive = true;
    listCommunities()
      .then((rows) => {
        if (alive) setCommunities(rows);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open, community]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    const name = form.name.trim();
    if (name.length < 2) return setError(t("create.errName"));
    setBusy(true);
    try {
      let slug = slugify(name) || `kanal-${Date.now().toString(36)}`;
      if (await getChannelBySlug(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

      const parent =
        community || communities.find((row) => row.id === form.communityId) || null;

      const channel = await createChannelRecord({
        name,
        slug,
        description: form.description.trim(),
        visibility: form.visibility,
        kind: "custom",
        owner_id: user.id,
        owner_handle: profile?.handle || "",
        members: [user.id],
        ...(parent
          ? {
              community_id: parent.id,
              community_name: parent.name,
              community_slug: parent.slug,
            }
          : {}),
      });

      if (form.visibility === "private") {
        const key = newKey();
        const wrapped = await wrapFor(profile.public_key, key);
        await addChannelMember({
          channel_id: channel.id,
          user_id: user.id,
          handle: profile?.handle || "",
          role: "owner",
          wrapped_key: wrapped,
        });
      }

      toast.success(t("create.success", { name }));
      setForm({ name: "", description: "", visibility: "public", communityId: "" });
      onOpenChange(false);
      onCreated?.(channel);
    } catch (err) {
      setError(err?.message || t("create.err"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.08] bg-[hsl(var(--card))] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg tracking-[-0.02em] text-white">{t("create.title")}</DialogTitle>
          <DialogDescription className="text-[12.5px] text-muted-foreground">{t("create.desc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mono-label">{t("create.name")}</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder={t("create.namePlaceholder")}
              className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40"
            />
          </label>

          <label className="block">
            <span className="mono-label">{t("create.description")}</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={2}
              placeholder={t("create.descriptionPlaceholder")}
              className="mt-1.5 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white outline-none focus:border-neon/40"
            />
          </label>

          {community ? (
            <p className="flex items-center gap-2 rounded-xl border border-neon/25 bg-neon/[0.06] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-neon">
              <Users className="h-3.5 w-3.5" /> {t("create.communityFixed", { name: community.name })}
            </p>
          ) : (
            <label className="block">
              <span className="mono-label">{t("create.community")}</span>
              <select
                value={form.communityId}
                onChange={(event) => setForm((prev) => ({ ...prev, communityId: event.target.value }))}
                className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-[hsl(var(--card))] px-3 text-sm text-white outline-none focus:border-neon/40"
              >
                <option value="">{t("create.communityNone")}</option>
                {communities.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
              <span className="mt-1 block font-mono text-[10px] text-muted-foreground/70">
                {t("create.communityHint")}
              </span>
            </label>
          )}

          <div className="grid grid-cols-2 gap-2">
            {[
              { value: "public", label: t("create.public"), hint: t("create.publicHint"), icon: Hash },
              { value: "private", label: t("create.private"), hint: t("create.privateHint"), icon: LockKeyhole },
            ].map(({ value, label, hint, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, visibility: value }))}
                className={
                  form.visibility === value
                    ? "flex items-start gap-2 rounded-xl border border-neon/40 bg-neon/[0.08] px-3 py-2.5 text-left"
                    : "flex items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-white/20"
                }
              >
                <Icon
                  className={form.visibility === value ? "mt-0.5 h-3.5 w-3.5 text-neon" : "mt-0.5 h-3.5 w-3.5 text-muted-foreground"}
                />
                <span>
                  <span className="block text-[12.5px] font-medium text-white">{label}</span>
                  <span className="block font-mono text-[10px] text-muted-foreground">{hint}</span>
                </span>
              </button>
            ))}
          </div>

          {error && (
            <p className="rounded-xl border border-signal-red/30 bg-signal-red/[0.07] px-3 py-2 text-[12px] text-signal-red">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-neon font-mono text-[10.5px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {t("create.submit")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
