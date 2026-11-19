import {
  KeyRound,
  Loader2,
  Lock,
  Mail,
  MailCheck,
  MessageCircle,
  RefreshCw,
  UserPlus,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/api/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { CaptchaField } from "@/components/auth/CaptchaField";
import { AuthError, AuthLink, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeReturnTo } from "@/lib/authReturnTo";
import { useLang } from "@/lib/i18n";

/**
 * /register sayfası.
 * Alanlar sunucunun kayıt yöntemine göre değişir:
 *   email    → e-posta + parola, doğrulama postası
 *   invite   → kullanıcı adı + parola + davet kodu
 *   captcha  → kullanıcı adı + parola + kendi captcha'mız
 *   telegram → kullanıcı adı + parola, botta /start <kod>
 *   open     → kullanıcı adı + parola
 */
export function RegisterPage() {
  const { t } = useLang();
  const returnTo = safeReturnTo();
  const [info, setInfo] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [mailSent, setMailSent] = useState(true);
  const [telegram, setTelegram] = useState(null);
  const [telegramStatus, setTelegramStatus] = useState("pending");
  const [telegramError, setTelegramError] = useState("");

  const method = info?.registration_method || "email";
  const captchaType = info?.captcha_provider || "none";

  const loadChallenge = useCallback(async () => {
    try {
      const data = await api.captcha.get();
      setChallenge(data?.provider === "local" ? data.challenge : null);
    } catch {
      setChallenge(null);
    }
    setCaptchaAnswer("");
  }, []);

  useEffect(() => {
    let alive = true;
    api.settings
      .get()
      .then((data) => alive && setInfo(data))
      .catch(() => {});
    loadChallenge();
    return () => {
      alive = false;
    };
  }, [loadChallenge]);

  // Telegram kaydı: kod botta onaylanınca oturumu aç.
  useEffect(() => {
    if (!telegram?.code) return undefined;
    let stopped = false;
    let timer;

    const tick = async () => {
      try {
        const result = await api.auth.telegramStatus(telegram.code);
        if (stopped) return;
        setTelegramStatus(result.status);
        if (result.status === "verified") {
          window.location.href = returnTo;
          return;
        }
        if (result.status === "expired" || result.status === "unknown") return;
      } catch {
        /* ağ hatası: tekrar dene */
      }
      if (!stopped) timer = setTimeout(tick, 2500);
    };

    timer = setTimeout(tick, 1500);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [telegram, returnTo]);

  async function resendTelegram() {
    setBusy(true);
    setTelegramError("");
    try {
      const result = await api.auth.telegramResend(username.trim(), password);
      setTelegram(result.telegram);
      setTelegramStatus("pending");
    } catch (err) {
      setTelegramError(err.message || t("auth.telegram.resendFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function register(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError(t("auth.register.errShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("auth.register.errMismatch"));
      return;
    }

    const payload = { password };
    if (method === "email") payload.email = email.trim();
    else payload.username = username.trim();
    if (method === "invite") payload.invite_code = inviteCode.trim();
    if (captchaType === "local") {
      payload.captcha_id = challenge?.id || "";
      payload.captcha_answer = captchaAnswer;
    }
    if (captchaType === "turnstile") payload.turnstile_token = turnstileToken;

    setBusy(true);
    try {
      const result = await api.auth.register(payload);

      if (result.verification_required && result.method === "telegram") {
        setTelegram(result.telegram);
        setTelegramStatus("pending");
        setBusy(false);
        return;
      }

      if (result.verification_required) {
        setSentTo(result.email || email);
        setMailSent(result.mail_sent !== false);
        setBusy(false);
        return;
      }

      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || t("auth.register.err"));
      setBusy(false);
      if (captchaType !== "none") await loadChallenge();
    }
  }

  if (telegram) {
    const done = telegramStatus === "verified";
    const expired = telegramStatus === "expired" || telegramStatus === "unknown";

    return (
      <AuthLayout icon={MessageCircle} title={t("auth.telegram.title")} subtitle={t("auth.telegram.subtitle")}>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p>{t("auth.telegram.hint")}</p>
          <code className="block select-all rounded-lg bg-primary/10 px-3 py-2.5 text-center font-mono text-[15px] tracking-[0.12em] text-foreground">
            /start {telegram.code}
          </code>
          <a
            href={telegram.bot_url}
            target="_blank"
            rel="noreferrer"
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            <MessageCircle className="h-4 w-4" />
            {t("auth.telegram.open")}
          </a>
          <p
            className={
              expired
                ? "rounded-lg border border-signal-yellow/30 bg-signal-yellow/[0.08] p-3 text-[13px] text-signal-yellow"
                : "text-[13px]"
            }
          >
            {expired
              ? t("auth.telegram.expired")
              : done
                ? t("auth.telegram.verified")
                : t("auth.telegram.waiting")}
          </p>

          {expired && (
            <button
              type="button"
              onClick={resendTelegram}
              disabled={busy}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 font-medium text-primary transition hover:bg-primary/15 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {t("auth.telegram.resend")}
            </button>
          )}

          {telegramError && (
            <p className="rounded-lg border border-signal-red/30 bg-signal-red/[0.08] p-3 text-[13px] text-signal-red">
              {telegramError}
            </p>
          )}

          <AuthLink to="/login" returnTo={returnTo} className="inline-block font-medium text-primary hover:underline">
            {t("auth.verify.back")}
          </AuthLink>
        </div>
      </AuthLayout>
    );
  }

  if (sentTo) {
    return (
      <AuthLayout icon={MailCheck} title={t("auth.verify.title")} subtitle={t("auth.verify.subtitle")}>
        <div className="space-y-4 text-sm text-muted-foreground">
          <p className="rounded-lg bg-primary/10 p-3 text-foreground">{t("auth.verify.sent", { email: sentTo })}</p>
          <p className="text-[13px]">{t("auth.verify.hint")}</p>
          {!mailSent && (
            <p className="rounded-lg border border-signal-yellow/30 bg-signal-yellow/[0.08] p-3 text-[13px] text-signal-yellow">
              {t("auth.verify.mailFailed")}
            </p>
          )}
          <AuthLink to="/login" returnTo={returnTo} className="inline-block font-medium text-primary hover:underline">
            {t("auth.verify.back")}
          </AuthLink>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={UserPlus} title={t("auth.register.title")} subtitle={t("auth.register.subtitle")}>
      <AuthError>{error}</AuthError>
      <form onSubmit={register} className="space-y-4">
        {method !== "email" && (
          <div className="space-y-2">
            <Label htmlFor="register-username">{t("auth.username")}</Label>
            <div className="relative">
              <UserRound
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="register-username"
                type="text"
                autoComplete="username"
                autoFocus
                autoCapitalize="none"
                spellCheck={false}
                placeholder={t("auth.username.placeholder")}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="h-12 pl-10 font-mono"
                disabled={busy}
                required
              />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {t("auth.username.hint")}
            </p>
          </div>
        )}

        {method === "email" && (
          <div className="space-y-2">
            <Label htmlFor="register-email">{t("auth.email")}</Label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="register-email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 pl-10"
                disabled={busy}
                required
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="register-password">{t("auth.password")}</Label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 pl-10"
              disabled={busy}
              required
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="register-confirm">{t("auth.confirmPassword")}</Label>
          <div className="relative">
            <Lock
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="register-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12 pl-10"
              disabled={busy}
              required
            />
          </div>
        </div>

        {method === "invite" && (
          <div className="space-y-2">
            <Label htmlFor="register-invite">{t("auth.invite.label")}</Label>
            <div className="relative">
              <KeyRound
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="register-invite"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                placeholder={t("auth.invite.placeholder")}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="h-12 pl-10 font-mono tracking-[0.15em]"
                disabled={busy}
                required
              />
            </div>
            <p className="text-[11.5px] text-muted-foreground">{t("auth.invite.hint")}</p>
          </div>
        )}

        <CaptchaField
          provider={captchaType}
          challenge={challenge}
          siteKey={info?.turnstile_site_key}
          answer={captchaAnswer}
          onAnswer={setCaptchaAnswer}
          onToken={setTurnstileToken}
          onRefresh={loadChallenge}
        />

        <SubmitButton busy={busy} busyLabel={t("auth.register.busy")}>
          {t("auth.register.submit")}
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.register.haveAccount")}{" "}
        <AuthLink to="/login" returnTo={returnTo}>
          {t("auth.register.login")}
        </AuthLink>
      </p>
    </AuthLayout>
  );
}
