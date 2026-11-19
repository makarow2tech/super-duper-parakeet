import { useEffect, useState } from "react";
import { Loader2, MailCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthLink } from "@/components/auth/parts";
import { useLang } from "@/lib/i18n";

/** /verify-email?token=... — kayıt sonrası e-postadaki bağlantı buraya gelir. */
export function VerifyEmailPage() {
  const { t } = useLang();
  const [state, setState] = useState("checking");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState("invalid");
      return;
    }

    let alive = true;
    api.auth
      .verifyEmail(token)
      .then(() => {
        if (!alive) return;
        setState("done");
        toast.success(t("auth.verify.done"));
        setTimeout(() => {
          window.location.href = "/";
        }, 900);
      })
      .catch(() => {
        if (alive) setState("invalid");
      });

    return () => {
      alive = false;
    };
  }, [t]);

  if (state === "checking") {
    return (
      <AuthLayout icon={MailCheck} title={t("auth.verify.title")} subtitle={t("auth.verify.checking")}>
        <div className="grid place-items-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  if (state === "done") {
    return (
      <AuthLayout icon={MailCheck} title={t("auth.verify.doneTitle")} subtitle={t("auth.verify.done")}>
        <div className="grid place-items-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout icon={ShieldX} title={t("auth.verify.failedTitle")} subtitle={t("auth.verify.failed")}>
      <div className="space-y-4 text-sm text-muted-foreground">
        <AuthLink to="/login" className="inline-block font-medium text-primary hover:underline">
          {t("auth.verify.back")}
        </AuthLink>
      </div>
    </AuthLayout>
  );
}
