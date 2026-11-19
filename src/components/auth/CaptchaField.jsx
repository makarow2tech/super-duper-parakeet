import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang } from "@/lib/i18n";

/**
 * Kayıt formu insan doğrulaması.
 * provider "local" ise sunucudan gelen yazıyı kutuya yazdırır;
 * "turnstile" ise Cloudflare widget'ını yükler.
 */
export function CaptchaField({ provider, challenge, siteKey, answer, onAnswer, onToken, onRefresh }) {
  const { t } = useLang();

  if (provider === "turnstile") return <Turnstile siteKey={siteKey} onToken={onToken} />;
  if (provider !== "local" || !challenge) return null;

  return (
    <div className="space-y-2">
      <Label htmlFor="register-captcha">{t("auth.captcha.label")}</Label>
      <p className="text-[12.5px] text-muted-foreground">{t("auth.captcha.instruction")}</p>
      <div className="flex items-center gap-2">
        <div
          className="flex-1 select-none rounded-lg border border-primary/25 bg-primary/[0.07] px-3 py-2.5 text-center font-mono text-[15px] tracking-[0.12em] text-primary"
          aria-live="polite"
        >
          {challenge.text}
        </div>
        <button
          type="button"
          onClick={onRefresh}
          title={t("auth.captcha.refresh")}
          aria-label={t("auth.captcha.refresh")}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/[0.08] text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>
      <Input
        id="register-captcha"
        value={answer}
        onChange={(event) => onAnswer(event.target.value)}
        placeholder={t("auth.captcha.placeholder")}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        className="h-11 font-mono"
        required
      />
    </div>
  );
}

function Turnstile({ siteKey, onToken }) {
  const box = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!siteKey) return undefined;

    let widget = null;
    let cancelled = false;

    const render = () => {
      if (cancelled || !box.current || !window.turnstile) return;
      widget = window.turnstile.render(box.current, {
        sitekey: siteKey,
        theme: "dark",
        callback: (token) => onToken(token),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };

    if (window.turnstile) {
      render();
    } else {
      const existing = document.querySelector("script[data-krypt-turnstile]");
      if (existing) {
        existing.addEventListener("load", render);
      } else {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.defer = true;
        script.dataset.kryptTurnstile = "1";
        script.addEventListener("load", render);
        script.addEventListener("error", () => setError("Turnstile yüklenemedi"));
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      const element = document.querySelector("script[data-krypt-turnstile]");
      if (element) element.removeEventListener("load", render);
      if (widget !== null && window.turnstile) window.turnstile.remove(widget);
    };
  }, [siteKey, onToken]);

  if (!siteKey) {
    return (
      <p className="rounded-lg border border-signal-yellow/30 bg-signal-yellow/[0.08] p-3 text-[12.5px] text-signal-yellow">
        Turnstile seçili ama TURNSTILE_SITE_KEY boş. Sunucudaki .env dosyasını doldur.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <span className="mono-label">güvenlik doğrulaması</span>
      <div ref={box} />
      {error && <p className="text-[12px] text-signal-red">{error}</p>}
    </div>
  );
}
