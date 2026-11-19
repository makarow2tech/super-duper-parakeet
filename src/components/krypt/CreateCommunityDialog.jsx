import { useState } from "react";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { useVault } from "@/lib/VaultContext";
import { createCommunityRecord, getCommunityBySlug } from "@/lib/kryptApi";
import { slugify } from "@/lib/krypt";
import { useLang } from "@/lib/i18n";

export default function CreateCommunityDialog({ open, onOpenChange, onCreated }) {
  const { t } = useLang();
  const { user } = useAuth();
  const { profile } = useVault();
  const [form, setForm] = useState({ name: "", description: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    const name = form.name.trim();
    if (name.length < 2) return setError(t("createCommunity.errName"));
    setBusy(true);
    try {
      let slug = slugify(name) || `topluluk-${Date.now().toString(36)}`;
      if (await getCommunityBySlug(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;

      const community = await createCommunityRecord({
        name,
        slug,
        description: form.description.trim(),
        owner_id: user.id,
        owner_handle: profile?.handle || "",
      });

      toast.success(t("createCommunity.success", { name }));
      setForm({ name: "", description: "" });
      onOpenChange(false);
      onCreated?.(community);
    } catch (err) {
      setError(err?.message || t("createCommunity.err"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.08] bg-[hsl(var(--card))] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg tracking-[-0.02em] text-white">
            {t("createCommunity.title")}
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-muted-foreground">
            {t("createCommunity.desc")}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mono-label">{t("createCommunity.name")}</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder={t("createCommunity.namePlaceholder")}
              className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40"
            />
          </label>

          <label className="block">
            <span className="mono-label">{t("createCommunity.description")}</span>
            <textarea
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              rows={2}
              placeholder={t("createCommunity.descriptionPlaceholder")}
              className="mt-1.5 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white outline-none focus:border-neon/40"
            />
          </label>

          <p className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-neon" /> {t("createCommunity.hint")}
          </p>

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
            {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} {t("createCommunity.submit")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
