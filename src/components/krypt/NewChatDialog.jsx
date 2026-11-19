import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, MessageSquarePlus } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { useVault } from "@/lib/VaultContext";
import { addChannelMember, createChannelRecord, getChannelBySlug, getProfileByHandle } from "@/lib/kryptApi";
import { normalizeHandle } from "@/lib/krypt";
import { notifyMembers } from "@/lib/notify";
import { useLang } from "@/lib/i18n";

export default function NewChatDialog({ open, onOpenChange }) {
  const { t } = useLang();
  const { user } = useAuth();
  const { profile, newKey, wrapFor } = useVault();
  const navigate = useNavigate();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    const wanted = normalizeHandle(handle);
    if (!wanted) return setError(t("newChat.errHandle"));
    setBusy(true);
    try {
      const target = await getProfileByHandle(wanted);
      if (!target) {
        setError(t("newChat.errNotFound"));
        return;
      }
      if (target.user_id === user.id) {
        setError(t("newChat.errSelf"));
        return;
      }

      const pair = [profile.handle, target.handle].sort();
      const slug = `dm-${pair.join("-")}`;
      const existing = await getChannelBySlug(slug);
      if (existing) {
        onOpenChange(false);
        navigate({ to: "/messages/$slug", params: { slug } });
        return;
      }

      const key = newKey();
      const mine = await wrapFor(profile.public_key, key);
      const theirs = await wrapFor(target.public_key, key);

      const channel = await createChannelRecord({
        name: pair.join(" · "),
        slug,
        visibility: "private",
        kind: "direct",
        owner_id: user.id,
        owner_handle: profile.handle,
        members: [user.id, target.user_id],
      });
      await addChannelMember({
        channel_id: channel.id,
        user_id: user.id,
        handle: profile.handle,
        role: "owner",
        wrapped_key: mine,
      });
      await addChannelMember({
        channel_id: channel.id,
        user_id: target.user_id,
        handle: target.handle,
        role: "member",
        wrapped_key: theirs,
      });
      notifyMembers({
        data: {
          channelId: channel.id,
          type: "dm",
          title: t("newChat.notify", { handle: profile.handle }),
          onlyUserId: target.user_id,
        },
      }).catch(() => {});

      setHandle("");
      onOpenChange(false);
      navigate({ to: "/messages/$slug", params: { slug } });
    } catch (err) {
      setError(err?.message || t("newChat.err"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.08] bg-[hsl(var(--card))] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg tracking-[-0.02em] text-white">{t("newChat.title")}</DialogTitle>
          <DialogDescription className="text-[12.5px] text-muted-foreground">{t("newChat.desc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 focus-within:border-neon/40">
            <span className="font-mono text-sm text-neon">@</span>
            <input
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder={t("newChat.placeholder")}
              className="h-10 w-full bg-transparent px-2 font-mono text-sm text-white outline-none placeholder:text-muted-foreground/60"
            />
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
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquarePlus className="h-3.5 w-3.5" />}{" "}
            {t("newChat.submit")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}