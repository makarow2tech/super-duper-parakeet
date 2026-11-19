import { Lock, LogIn, Mail, MailCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthError, AuthLink, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/api/client";
import { safeReturnTo } from "@/lib/authReturnTo";
import { useLang } from "@/lib/i18n";

// The /login page. ?returnTo= (or the platform's ?from_url=) is where the visitor
// goes after signing in — the login gate and the MCP consent page send people here with it.
export function LoginPage() {
  const { t } = useLang();
  const returnTo = safeReturnTo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [unverified, setUnverified] = useState(false);
  const [resending, setResending] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setUnverified(false);
    setBusy(true);
    try {
      await api.auth.login(email, password);
      // A hard redirect: the app re-initializes with the new session.
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || t("auth.login.invalid"));
      setUnverified(err?.code === "email_unverified");
      setBusy(false);
    }
  }

  async function resend() {
    setResending(true);
    try {
      await api.auth.resendVerification(email);
      toast.success(t("auth.verify.resent"));
      setUnverified(false);
    } catch (err) {
      toast.error(err?.message || t("auth.verify.failed"));
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout icon={LogIn} title={t("auth.login.title")} subtitle={t("auth.login.subtitle")}>
      <AuthError>{error}</AuthError>
      {unverified && (
        <button
          type="button"
          onClick={resend}
          disabled={resending}
          className="mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/15 disabled:opacity-60"
        >
          <MailCheck className="h-4 w-4" />
          {t("auth.verify.resend")}
        </button>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="login-email">{t("auth.login.identifier")}</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="login-email" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 pl-10" required />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password">{t("auth.password")}</Label>
            <AuthLink to="/forgot-password" returnTo={returnTo} className="text-xs text-primary hover:underline">
              {t("auth.forgot")}
            </AuthLink>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 pl-10" required />
          </div>
        </div>
        <SubmitButton busy={busy} busyLabel={t("auth.login.busy")}>
          {t("auth.login.submit")}
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t("auth.login.noAccount")}{" "}
        <AuthLink to="/register" returnTo={returnTo}>
          {t("auth.login.createOne")}
        </AuthLink>
      </p>
    </AuthLayout>
  );
}
