import { useState } from "react";
import { Megaphone } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useSite } from "@/lib/SiteContext";
import { VaultProvider } from "@/lib/VaultContext";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import Sidebar from "@/components/krypt/Sidebar";
import Topbar from "@/components/krypt/Topbar";
import VaultGate from "@/components/krypt/VaultGate";

export default function KryptShell({ children }) {
  const { user } = useAuth();
  const { motd } = useSite();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <VaultProvider>
      <div className="min-h-screen">
        <div className="mx-auto flex w-full max-w-[1560px]">
          <aside className="sticky top-0 hidden h-screen w-[266px] shrink-0 border-r border-white/[0.06] bg-[hsl(var(--sidebar-background))]/60 backdrop-blur-sm lg:block">
            <Sidebar user={user} />
          </aside>

          <div className="min-w-0 flex-1">
            <Topbar user={user} onOpenMenu={() => setMenuOpen(true)} />
            <main className="px-4 pb-20 pt-5 sm:px-6 lg:px-8">
              {motd?.trim() && (
                <div className="mb-4 flex items-start gap-2.5 rounded-2xl border border-signal-yellow/25 bg-signal-yellow/[0.06] px-3.5 py-2.5">
                  <Megaphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-yellow" />
                  <p className="min-w-0 break-words text-[12.5px] leading-relaxed text-signal-yellow [overflow-wrap:anywhere]">
                    {motd}
                  </p>
                </div>
              )}
              <VaultGate>{children}</VaultGate>
            </main>
          </div>
        </div>

        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetContent side="left" className="w-[280px] border-white/[0.08] bg-[hsl(var(--sidebar-background))] p-0">
            <Sidebar user={user} onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>
    </VaultProvider>
  );
}