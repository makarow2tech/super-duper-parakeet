import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { useVault } from "@/lib/VaultContext";
import { addChannelMember, getProfileByHandle, updateChannel } from "@/lib/kryptApi";
import { normalizeHandle } from "@/lib/krypt";
import { notifyMembers } from "@/lib/notify";
import { useLang } from "@/lib/i18n";

export default function InviteDialog({ open, onOpenChange, channel, onInvited }) {
  const { t } = useLang();
  const { user } = useAuth();
  const { profile, channelKey, wrapFor } = useVault();
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    const wanted = normalizeHandle(handle);
    if (!wanted) return setError(t("invite.errHandle"));
    setBusy(true);
    try {
      const target = await getProfileByHandle(wanted);
      if (!target) {
        setError(t("invite.errNotFound"));
        return;
      }
      if (target.user_id === user.id) {
        setError(t("invite.errSelf"));
        return;
      }
      if ((channel.members || []).includes(target.user_id)) {
        setError(t("invite.errMember"));
        return;
      }

      const key = await channelKey(channel);
      if (!key) {
        setError(t("invite.errNoKey"));
        return;
      }
      const wrapped = await wrapFor(target.public_key, key);

      await addChannelMember({
        channel_id: channel.id,
        user_id: target.user_id,
        handle: target.handle,
        role: "member",
        wrapped_key: wrapped,
      });
      await updateChannel(channel.id, { members: [...(channel.members || []), target.user_id] });

      notifyMembers({
        data: {
          channelId: channel.id,
          type: "invite",
          title: t("invite.titleNotify", {
            handle: profile?.handle || t("common.user"),
            channel: channel.name,
          }),
          onlyUserId: target.user_id,
        },
      }).catch(() => {});

      toast.success(t("invite.success", { handle: target.handle }));
      setHandle("");
      onOpenChange(false);
      onInvited?.();
    } catch (err) {
      setError(err?.message || t("invite.err"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/[0.08] bg-[hsl(var(--card))] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg tracking-[-0.02em] text-white">{t("invite.title")}</DialogTitle>
          <DialogDescription className="text-[12.5px] text-muted-foreground">{t("invite.desc")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <div className="flex items-center rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 focus-within:border-neon/40">
            <span className="font-mono text-sm text-neon">@</span>
            <input
              value={handle}
              onChange={(event) => setHandle(event.target.value)}
              placeholder={t("invite.placeholder")}
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
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserPlus className="h-3.5 w-3.5" />}{" "}
            {t("invite.submit")}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}