import { useEffect, useRef, useState } from "react";
import { Flag, Loader2, LockKeyhole, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useVault } from "@/lib/VaultContext";
import { createMessageRecord, deleteMessageRecord, listMessages, subscribeMessages } from "@/lib/kryptApi";
import { decryptMessage, encryptMessage } from "@/lib/crypto";
import { timeStamp } from "@/lib/krypt";
import { notifyMembers } from "@/lib/notify";
import HandleAvatar from "@/components/krypt/HandleAvatar";
import MessageText from "@/components/krypt/MessageText";
import ReportDialog from "@/components/krypt/ReportDialog";
import { useLang } from "@/lib/i18n";

export default function ChannelThread({ channel, membership, direct = false }) {
  const { t, lang } = useLang();
  const { user } = useAuth();
  const { profile, channelKey } = useVault();
  const [key, setKey] = useState(null);
  const [rows, setRows] = useState([]);
  const [texts, setTexts] = useState({});
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setRows([]);
    setTexts({});
    (async () => {
      const resolved = await channelKey(channel, membership);
      if (!alive) return;
      setKey(resolved);
      const list = await listMessages(channel.id);
      if (!alive) return;
      setRows(list);
      setLoading(false);
      if (resolved) {
        const pairs = await Promise.all(list.map(async (row) => [row.id, await decryptMessage(row.cipher, resolved)]));
        if (alive) setTexts(Object.fromEntries(pairs));
      }
    })();
    return () => {
      alive = false;
    };
  }, [channel.id, membership?.id, channelKey]);

  useEffect(() => {
    const unsubscribe = subscribeMessages(channel.id, async (event) => {
      if (event.type === "delete") {
        setRows((prev) => prev.filter((row) => row.id !== event.id));
        return;
      }
      if (event.type !== "create" || !key) return;
      const plain = await decryptMessage(event.data.cipher, key);
      setRows((prev) => (prev.some((row) => row.id === event.id) ? prev : [...prev, event.data]));
      setTexts((prev) => ({ ...prev, [event.id]: plain }));
    });
    return unsubscribe;
  }, [channel.id, key]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [rows.length, loading]);

  async function send(event) {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !key) return;
    setSending(true);
    try {
      const cipher = await encryptMessage(text, key);
      const created = await createMessageRecord({
        channel_id: channel.id,
        author_id: user.id,
        author_handle: profile?.handle || "",
        cipher,
        kind: "text",
      });
      setRows((prev) => (prev.some((row) => row.id === created.id) ? prev : [...prev, created]));
      setTexts((prev) => ({ ...prev, [created.id]: text }));
      setDraft("");
      notifyMembers({
        data: {
          channelId: channel.id,
          type: direct ? "dm" : "message",
          title: direct
            ? t("thread.dmTitle", { handle: profile?.handle || t("common.user") })
            : t("thread.messageTitle", {
                handle: profile?.handle || t("common.user"),
                channel: channel.name,
              }),
        },
      }).catch(() => {});
    } catch (error) {
      toast.error(error?.message || t("thread.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  async function remove(row) {
    await deleteMessageRecord(row.id);
    setRows((prev) => prev.filter((item) => item.id !== row.id));
  }

  return (
    <div className="flex h-[calc(100vh-13rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/50">
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
        {loading && (
          <div className="grid place-items-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-neon" />
          </div>
        )}

        {!loading && !key && (
          <div className="mx-auto max-w-sm rounded-2xl border border-neon-2/25 bg-neon-2/[0.05] px-4 py-6 text-center">
            <LockKeyhole className="mx-auto h-5 w-5 text-neon-2" />
            <p className="mt-3 text-sm text-white">{t("thread.noKey")}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">{t("thread.noKeyHint")}</p>
          </div>
        )}

        {!loading && key && rows.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">{t("thread.empty")}</p>
        )}

        {rows.map((row) => {
          const mine = row.author_id === user.id;
          const text = texts[row.id];
          return (
            <div key={row.id} className={mine ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  mine
                    ? "flex min-w-0 max-w-[85%] flex-row-reverse items-start gap-2"
                    : "flex min-w-0 max-w-[85%] items-start gap-2"
                }
              >
                <HandleAvatar name={row.author_handle || "?"} size={28} />
                <div className="min-w-0">
                  <div className={mine ? "flex items-center justify-end gap-2" : "flex items-center gap-2"}>
                    <span className="font-mono text-[11px] text-white">
                      @{row.author_handle || t("feed.user")}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      {timeStamp(row.created_date, lang)}
                    </span>
                  </div>
                  <div
                    className={
                      mine
                        ? "mt-1 max-w-full min-w-0 overflow-hidden rounded-2xl rounded-tr-sm border border-neon/25 bg-neon/[0.09] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white"
                        : "mt-1 max-w-full min-w-0 overflow-hidden rounded-2xl rounded-tl-sm border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-foreground/90"
                    }
                  >
                    {text === undefined ? (
                      <span className="font-mono text-[11px] text-muted-foreground">{t("thread.decrypting")}</span>
                    ) : text === "" ? (
                      <span className="font-mono text-[11px] text-signal-yellow">{t("thread.decryptFailed")}</span>
                    ) : (
                      <MessageText text={text} />
                    )}
                  </div>
                  {mine ? (
                    <button
                      type="button"
                      onClick={() => remove(row)}
                      className="mt-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 transition hover:text-signal-red"
                    >
                      <Trash2 className="h-2.5 w-2.5" /> {t("thread.delete")}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setReportTarget({
                          type: "message",
                          id: row.id,
                          handle: row.author_handle,
                          channel_id: channel.id,
                          channel_slug: channel.slug,
                        })
                      }
                      className="mt-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 transition hover:text-signal-yellow"
                    >
                      <Flag className="h-2.5 w-2.5" /> {t("thread.report")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="border-t border-white/[0.07] bg-[hsl(var(--background))]/40 px-3 py-3 sm:px-4">
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(event);
              }
            }}
            rows={1}
            disabled={!key}
            placeholder={key ? t("thread.placeholder") : t("thread.noKeyPlaceholder")}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-neon/40 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!key || sending || !draft.trim()}
            className="grid h-10 w-10 place-items-center rounded-xl bg-neon text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 disabled:opacity-40"
            aria-label={t("thread.send")}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground/60">
          <LockKeyhole className="h-2.5 w-2.5" /> {t("thread.footer")}
        </p>
      </form>

      <ReportDialog
        open={!!reportTarget}
        onOpenChange={(open) => !open && setReportTarget(null)}
        target={reportTarget}
      />
    </div>
  );
}