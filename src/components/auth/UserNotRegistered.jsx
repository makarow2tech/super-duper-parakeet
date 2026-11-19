import { UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/i18n";
import { AuthLayout } from "./AuthLayout";

// Signed in, but not a user of this app (invite-only apps).
export function UserNotRegistered() {
  const { t } = useLang();
  const { logout } = useAuth();
  return (
    <AuthLayout
      icon={UserX}
      title={t("auth.notRegistered.title")}
      subtitle={t("auth.notRegistered.subtitle")}
    >
      <p className="mb-6 text-center text-sm text-foreground">{t("auth.notRegistered.body")}</p>
      <Button variant="outline" className="h-12 w-full font-medium" onClick={logout}>
        {t("auth.notRegistered.signOut")}
      </Button>
    </AuthLayout>
  );
}
