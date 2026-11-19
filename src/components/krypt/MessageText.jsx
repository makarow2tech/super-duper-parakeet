import { useState } from "react";
import { ExternalLink, ShieldAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLang } from "@/lib/i18n";

// http(s):// veya www. ile başlayan bağlantılar. Sondaki noktalama bağlantıya dahil edilmez.
const URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;

function hrefFor(url) {
  return url.toLowerCase().startsWith("www.") ? `https://${url}` : url;
}

function isExternal(href) {
  try {
    return new URL(href).host !== window.location.host;
  } catch {
    return true;
  }
}

export default function MessageText({ text }) {
  const { t } = useLang();
  const [pending, setPending] = useState(null);

  const nodes = [];
  let cursor = 0;

  for (const match of text.matchAll(URL_RE)) {
    const raw = match[0];
    const trailing = raw.match(/[.,;:!?)\]}]+$/)?.[0] ?? "";
    const url = trailing ? raw.slice(0, -trailing.length) : raw;

    if (match.index > cursor) nodes.push({ type: "text", value: text.slice(cursor, match.index) });
    nodes.push({ type: "link", value: url });
    cursor = match.index + url.length;
  }

  if (cursor < text.length) nodes.push({ type: "text", value: text.slice(cursor) });

  function openLink(url) {
    const href = hrefFor(url);
    if (!isExternal(href)) {
      window.location.href = href;
      return;
    }
    setPending(href);
  }

  return (
    <>
      <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {nodes.map((node, index) =>
          node.type === "link" ? (
            <button
              key={index}
              type="button"
              onClick={() => openLink(node.value)}
              className="break-all font-medium text-neon underline decoration-neon/40 underline-offset-2 transition hover:text-neon/80"
            >
              {node.value}
            </button>
          ) : (
            <span key={index}>{node.value}</span>
          ),
        )}
      </p>

      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="border-white/[0.08] bg-[hsl(var(--card))] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-heading text-lg tracking-[-0.02em] text-white">
              <ShieldAlert className="h-4 w-4 text-signal-yellow" /> {t("link.title")}
            </DialogTitle>
            <DialogDescription className="text-[12.5px] text-muted-foreground">
              {t("link.desc", { url: pending || "" })}
            </DialogDescription>
          </DialogHeader>

          <p className="break-all rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 font-mono text-[11px] text-white">
            {pending}
          </p>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="h-9 rounded-xl border border-white/[0.08] px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:text-white"
            >
              {t("link.cancel")}
            </button>
            <button
              type="button"
              onClick={() => {
                const href = pending;
                setPending(null);
                if (href) window.open(href, "_blank", "noopener,noreferrer");
              }}
              className="flex h-9 items-center gap-1.5 rounded-xl bg-neon px-3 font-mono text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90"
            >
              <ExternalLink className="h-3.5 w-3.5" /> {t("link.open")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
