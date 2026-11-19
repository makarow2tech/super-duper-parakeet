import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { useLang } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Bir mesajı (veya kullanıcıyı) yöneticiye bildirir. Şifreli mesaj içeriği
// sunucuya gitmez; yalnızca mesaj kimliği, kanal ve kullanıcının yazdığı neden.
export default function ReportDialog({ open, onOpenChange, target }) {
  const { t } = useLang();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (!target) return;
    const text = reason.trim();
    if (text.length < 3) {
      toast.error(t("report.errShort"));
      return;
    }

    setBusy(true);
    try {
      await api.entities.Report.create({
        target_type: target.type,
        target_id: target.id,
        target_handle: target.handle || "",
        reason: text,
        channel_id: target.channel_id || "",
        channel_slug: target.channel_slug || "",
      });
      toast.success(t("report.success"));
      setReason("");
      onOpenChange(false);
    } catch (error) {
      toast.error(error?.message || t("report.err"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/[0.08] bg-[hsl(var(--card))]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-heading text-lg text-white">
            <Flag className="h-4 w-4 text-signal-yellow" /> {t("report.title")}
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-muted-foreground">
            {t("report.desc", { handle: target?.handle ? `@${target.handle}` : t("common.user") })}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            maxLength={500}
            autoFocus
            placeholder={t("report.placeholder")}
            className="w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-sm text-white outline-none focus:border-neon/40"
          />

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-xl border border-white/[0.08] px-3.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-white/20 hover:text-white"
            >
              {t("link.cancel")}
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex h-9 items-center gap-2 rounded-xl bg-neon px-3.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
              {t("report.submit")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
