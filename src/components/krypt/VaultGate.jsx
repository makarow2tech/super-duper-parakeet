import { Loader2 } from "lucide-react";
import { useVault } from "@/lib/VaultContext";
import VaultSetup from "@/components/krypt/VaultSetup";
import VaultUnlock from "@/components/krypt/VaultUnlock";
import { useLang } from "@/lib/i18n";

export default function VaultGate({ children }) {
  const { t } = useLang();
  const { loading, needsSetup, locked } = useVault();

  if (loading) {
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-neon" />
          <span className="mono-label">{t("vault.checking")}</span>
        </div>
      </div>
    );
  }

  if (needsSetup) return <VaultSetup />;
  if (locked) return <VaultUnlock />;
  return children;
}