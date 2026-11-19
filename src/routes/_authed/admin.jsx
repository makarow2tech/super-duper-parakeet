import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  BadgeCheck,
  Ban,
  Check,
  Copy,
  Crown,
  Database,
  Download,
  Flag,
  Link2,
  Plus,
  Power,
  Loader2,
  Mail,
  MicOff,
  Save,
  Settings2,
  ShieldCheck,
  Ticket,
  Trash2,
  Upload,
  UserCheck,
  UserMinus,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/api/client";
import { useAuth } from "@/lib/AuthContext";
import { tStatic } from "@/lib/i18n";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/_authed/admin")({
  head: () => ({ meta: [{ title: tStatic("titles.admin") }] }),
  component: AdminPage,
});

const TABS = [
  { id: "overview", label: "Genel bakış", icon: ShieldCheck },
  { id: "users", label: "Üyeler", icon: Users },
  { id: "invites", label: "Davetler", icon: Ticket },
  { id: "reports", label: "Şikayetler", icon: Flag },
  { id: "database", label: "Veritabanı", icon: Database },
  { id: "settings", label: "Ayarlar", icon: Settings2 },
];

const HOUR_OPTIONS = [
  { value: "", label: "süresiz" },
  { value: "1", label: "1 saat" },
  { value: "24", label: "24 saat" },
  { value: "168", label: "7 gün" },
  { value: "720", label: "30 gün" },
];

function statusBadges(row) {
  const badges = [];
  if (row.banned) badges.push({ label: "banlı", tone: "red" });
  if (row.muted) badges.push({ label: "susturulmuş", tone: "yellow" });
  if (row.email_verified === false) badges.push({ label: "doğrulanmamış", tone: "muted" });
  return badges;
}

function AdminPage() {
  const { user, isLoadingAuth } = useAuth();
  const [tab, setTab] = useState("overview");
  const [summary, setSummary] = useState(null);
  const [users, setUsers] = useState([]);
  const [reports, setReports] = useState([]);
  const [invites, setInvites] = useState([]);
  const [inviteForm, setInviteForm] = useState({ note: "", max_uses: 1, days: 7 });
  const [mail, setMail] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [importMode, setImportMode] = useState("merge");
  const [moderation, setModeration] = useState(null);
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    if (!user || user.role !== "admin") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [summaryData, usersData, settingsData, reportsData, mailData, inviteData] = await Promise.all([
        api.admin.summary(),
        api.admin.users(),
        api.admin.getSettings(),
        api.admin.reports(),
        api.admin.mailStatus(),
        api.admin.invites(),
      ]);
      setSummary(summaryData);
      setUsers(usersData.items || []);
      setSettings(settingsData);
      setReports(reportsData.items || []);
      setMail(mailData);
      setInvites(inviteData.items || []);
    } catch (error) {
      toast.error(error?.message || "Yönetim verileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!isLoadingAuth) load();
  }, [isLoadingAuth, load]);

  async function toggleRole(row) {
    const next = row.role === "admin" ? "user" : "admin";
    setBusy(row.id);
    try {
      await api.admin.setRole(row.id, next);
      toast.success(next === "admin" ? `${row.email} yönetici yapıldı` : `${row.email} yöneticilikten çıkarıldı`);
      await load();
    } catch (error) {
      toast.error(error?.message || "Rol değiştirilemedi");
    } finally {
      setBusy("");
    }
  }

  async function clearModeration(row, action) {
    setBusy(row.id);
    try {
      await api.admin.setModeration(row.id, { action });
      toast.success(action === "unban" ? `${row.email} banı kaldırıldı` : `${row.email} susturması kaldırıldı`);
      await load();
    } catch (error) {
      toast.error(error?.message || "İşlem yapılamadı");
    } finally {
      setBusy("");
    }
  }

  async function verifyUser(row) {
    setBusy(row.id);
    try {
      await api.admin.verifyUser(row.id);
      toast.success(`${row.email} doğrulandı`);
      await load();
    } catch (error) {
      toast.error(error?.message || "Kullanıcı doğrulanamadı");
    } finally {
      setBusy("");
    }
  }

  async function copyVerificationLink(row) {
    setBusy(row.id);
    try {
      const { link } = await api.admin.verificationLink(row.id);
      try {
        await navigator.clipboard.writeText(link);
        toast.success("Doğrulama bağlantısı kopyalandı", { description: row.email });
      } catch {
        toast.success("Doğrulama bağlantısı", { description: link });
      }
    } catch (error) {
      toast.error(error?.message || "Bağlantı oluşturulamadı");
    } finally {
      setBusy("");
    }
  }

  async function createInvite(event) {
    event.preventDefault();
    setBusy("invite");
    try {
      const { invite } = await api.admin.createInvite({
        note: inviteForm.note,
        max_uses: Number(inviteForm.max_uses),
        days: Number(inviteForm.days),
      });
      toast.success("Davet kodu üretildi", { description: invite.code });
      setInviteForm((prev) => ({ ...prev, note: "" }));
      await load();
    } catch (error) {
      toast.error(error?.message || "Davet kodu üretilemedi");
    } finally {
      setBusy("");
    }
  }

  async function copyInvite(invite) {
    try {
      await navigator.clipboard.writeText(invite.code);
      toast.success("Davet kodu kopyalandı", { description: invite.code });
    } catch {
      toast.success("Davet kodu", { description: invite.code });
    }
  }

  async function toggleInvite(invite) {
    setBusy(invite.id);
    try {
      await api.admin.setInviteActive(invite.id, invite.active === false);
      toast.success(invite.active === false ? "Davet yeniden açıldı" : "Davet kapatıldı");
      await load();
    } catch (error) {
      toast.error(error?.message || "Davet güncellenemedi");
    } finally {
      setBusy("");
    }
  }

  async function deleteInvite(invite) {
    if (!window.confirm(`${invite.code} daveti silinsin mi?`)) return;
    setBusy(invite.id);
    try {
      await api.admin.deleteInvite(invite.id);
      toast.success("Davet silindi");
      await load();
    } catch (error) {
      toast.error(error?.message || "Davet silinemedi");
    } finally {
      setBusy("");
    }
  }

  async function setReportStatus(row, status) {
    setBusy(row.id);
    try {
      await api.admin.setReportStatus(row.id, status);
      toast.success(status === "resolved" ? "Şikayet çözüldü" : "Şikayet yoksayıldı");
      await load();
    } catch (error) {
      toast.error(error?.message || "Şikayet güncellenemedi");
    } finally {
      setBusy("");
    }
  }

  async function exportDatabase() {
    setBusy("export");
    try {
      await api.admin.exportDatabase();
      toast.success("Veritabanı yedeği indirildi");
    } catch (error) {
      toast.error(error?.message || "Yedek indirilemedi");
    } finally {
      setBusy("");
    }
  }

  async function importDatabase(file) {
    if (!file) return;
    if (importMode === "replace" && !window.confirm("Tüm veriler yedekteki içerikle değiştirilecek. Emin misin?")) {
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setBusy("import");
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const result = await api.admin.importDatabase(parsed, importMode);
      toast.success(`${result.imported} kayıt yüklendi (${result.mode === "replace" ? "değiştir" : "birleştir"})`);
      await load();
    } catch (error) {
      toast.error(error?.message || "Yedek yüklenemedi");
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function saveSettings(event) {
    event.preventDefault();
    setBusy("settings");
    try {
      const saved = await api.admin.saveSettings(settings);
      setSettings(saved);
      toast.success("Ayarlar kaydedildi");
      await load();
    } catch (error) {
      toast.error(error?.message || "Ayarlar kaydedilemedi");
    } finally {
      setBusy("");
    }
  }

  if (isLoadingAuth || (loading && user?.role === "admin")) {
    return (
      <div className="grid min-h-[40vh] place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-neon" />
      </div>
    );
  }

  if (user?.role !== "admin") {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 px-6 py-10 text-center">
        <ShieldCheck className="mx-auto h-5 w-5 text-signal-yellow" />
        <p className="mt-3 text-sm text-white">Bu alan yalnızca yöneticilere açık.</p>
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          Yönetici hesabı, sunucudaki <span className="font-mono">admin.json</span> dosyasında tanımlıdır.
        </p>
      </div>
    );
  }

  const counts = summary?.counts || {};
  const openReports = reports.filter((row) => row.status === "open");

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4">
      <div>
        <span className="mono-label flex items-center gap-2">
          <span className="signal-dot" /> yönetim
        </span>
        <h1 className="mt-2 font-heading text-2xl font-semibold tracking-[-0.03em] text-white">Admin paneli</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Üyeleri, yöneticileri, site ayarlarını ve veritabanı yedeklerini buradan yönet.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={
              tab === id
                ? "flex h-9 items-center gap-2 rounded-xl border border-neon/40 bg-neon/[0.08] px-3.5 font-mono text-[10px] uppercase tracking-wider text-neon"
                : "flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] px-3.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-white/20 hover:text-white"
            }
          >
            <Icon className="h-3.5 w-3.5" /> {label}
            {id === "reports" && openReports.length > 0 && (
              <span className="rounded-full bg-signal-red/20 px-1.5 font-mono text-[9px] text-signal-red">
                {openReports.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Üye", value: counts.users, icon: Users },
              { label: "Yönetici", value: counts.admins, icon: Crown },
              { label: "Kanal", value: counts.channels, icon: ShieldCheck },
              { label: "Topluluk", value: counts.communities, icon: Database },
              { label: "Mesaj", value: counts.messages, icon: ShieldCheck },
              { label: "Profil", value: counts.profiles, icon: Users },
              { label: "Bildirim", value: counts.notifications, icon: ShieldCheck },
              { label: "Açık şikayet", value: counts.open_reports, icon: Flag },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-4">
                <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                  <Icon className="h-3 w-3 text-neon" /> {label}
                </span>
                <p className="mt-2 font-heading text-2xl font-semibold text-white">{value ?? 0}</p>
              </div>
            ))}
          </div>

          <section className="rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-5">
            <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neon">
              <ShieldCheck className="h-3.5 w-3.5" /> yönetici kaynağı
            </h2>
            <p className="mt-3 text-[13px] text-muted-foreground">
              Yönetici, ilk kayıt olan üye değildir. Sunucudaki{" "}
              <span className="font-mono text-white">{summary?.admin_file || "admin.json"}</span> dosyasında yazan
              e-posta ve parola ile giriş yapan hesap yönetici sayılır.
            </p>
            {summary?.file_admin_email && (
              <p className="mt-2 font-mono text-[11px] text-neon">{summary.file_admin_email}</p>
            )}
            {summary?.settings?.motd && (
              <p className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12.5px] text-muted-foreground">
                Duyuru: {summary.settings.motd}
              </p>
            )}
          </section>
        </>
      )}

      {tab === "users" && (
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon">
              üyeler · {users.length}
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {counts.admins || 0} yönetici
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-[13px]">
              <thead className="bg-white/[0.02] font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Üye</th>
                  <th className="px-4 py-2.5">Kullanıcı adı</th>
                  <th className="px-4 py-2.5">Rol / durum</th>
                  <th className="px-4 py-2.5">Kayıt</th>
                  <th className="px-4 py-2.5 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => {
                  const locked = busy === row.id || row.id === user.id;
                  return (
                    <tr key={row.id} className="border-t border-white/[0.05]">
                      <td className="px-4 py-2.5">
                        <p className="text-white">{row.display_name || row.full_name || "—"}</p>
                        <p className="font-mono text-[10.5px] text-muted-foreground">
                          {row.email || (row.username ? `@${row.username}` : "—")}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                        {row.handle ? `@${row.handle}` : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <span
                            className={
                              row.role === "admin"
                                ? "rounded-md border border-signal-yellow/30 bg-signal-yellow/[0.08] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-signal-yellow"
                                : "rounded-md border border-white/[0.08] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground"
                            }
                          >
                            {row.role === "admin" ? "admin" : "üye"}
                          </span>
                          {row.is_file_admin && (
                            <span className="font-mono text-[9px] uppercase tracking-wider text-neon/70">dosya</span>
                          )}
                          {statusBadges(row).map((badge) => (
                            <span
                              key={badge.label}
                              className={
                                badge.tone === "red"
                                  ? "rounded-md border border-signal-red/30 bg-signal-red/[0.08] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-signal-red"
                                  : badge.tone === "yellow"
                                    ? "rounded-md border border-signal-yellow/30 bg-signal-yellow/[0.08] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-signal-yellow"
                                    : "rounded-md border border-white/[0.08] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground"
                              }
                              title={badge.tone === "red" ? row.ban_reason : badge.tone === "yellow" ? row.mute_reason : ""}
                            >
                              {badge.label}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10.5px] text-muted-foreground">
                        {row.created_date ? String(row.created_date).slice(0, 10) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {row.email_verified === false && (
                            <button
                              type="button"
                              onClick={() => copyVerificationLink(row)}
                              disabled={busy === row.id}
                              title="Doğrulama bağlantısını kopyala (posta gönderilmediyse elle ilet)"
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground transition hover:border-neon/40 hover:text-neon disabled:opacity-40"
                            >
                              <Link2 className="h-3 w-3" /> bağlantı
                            </button>
                          )}

                          {row.email_verified === false && (
                            <button
                              type="button"
                              onClick={() => verifyUser(row)}
                              disabled={busy === row.id}
                              title="E-postayı elle doğrula"
                              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neon/30 bg-neon/[0.07] px-2.5 font-mono text-[9.5px] uppercase tracking-wider text-neon transition hover:bg-neon/[0.12] disabled:opacity-40"
                            >
                              <BadgeCheck className="h-3 w-3" /> doğrula
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() =>
                              row.muted
                                ? clearModeration(row, "unmute")
                                : setModeration({ row, action: "mute" })
                            }
                            disabled={locked}
                            title={row.muted ? "Susturmayı kaldır" : "Kullanıcıyı sustur"}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground transition hover:border-signal-yellow/40 hover:text-signal-yellow disabled:opacity-40"
                          >
                            <MicOff className="h-3 w-3" /> {row.muted ? "aç" : "sustur"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              row.banned ? clearModeration(row, "unban") : setModeration({ row, action: "ban" })
                            }
                            disabled={locked}
                            title={row.banned ? "Banı kaldır" : "Kullanıcıyı banla"}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground transition hover:border-signal-red/40 hover:text-signal-red disabled:opacity-40"
                          >
                            <Ban className="h-3 w-3" /> {row.banned ? "aç" : "banla"}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleRole(row)}
                            disabled={locked}
                            className={
                              row.role === "admin"
                                ? "inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground transition hover:border-signal-red/40 hover:text-signal-red disabled:opacity-40"
                                : "inline-flex h-8 items-center gap-1.5 rounded-lg border border-neon/30 bg-neon/[0.07] px-2.5 font-mono text-[9.5px] uppercase tracking-wider text-neon transition hover:bg-neon/[0.12] disabled:opacity-40"
                            }
                          >
                            {busy === row.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : row.role === "admin" ? (
                              <UserMinus className="h-3 w-3" />
                            ) : (
                              <UserCheck className="h-3 w-3" />
                            )}
                            {row.role === "admin" ? "yetkiyi al" : "admin yap"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!users.length && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      Üye yok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === "invites" && (
        <section className="space-y-3">
          <form
            onSubmit={createInvite}
            className="rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-5"
          >
            <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neon">
              <Ticket className="h-3.5 w-3.5" /> davet kodu üret
            </h2>
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              Kayıt yöntemi <span className="text-white">davet kodu</span> iken yalnızca buradaki kodlarla üye olunur.
              Kullanım sınırı <span className="text-white">0</span> = sınırsız, süre <span className="text-white">0</span> =
              süresiz. Kodlar tek seferlik gösterilmez; listeden her zaman kopyalayabilirsin.
            </p>

            <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_130px_130px_auto]">
              <label className="block">
                <span className="mono-label">not (isteğe bağlı)</span>
                <input
                  value={inviteForm.note}
                  onChange={(event) => setInviteForm((prev) => ({ ...prev, note: event.target.value }))}
                  maxLength={120}
                  placeholder="kime verildi"
                  className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40"
                />
              </label>
              <label className="block">
                <span className="mono-label">kullanım</span>
                <input
                  type="number"
                  min={0}
                  max={1000}
                  value={inviteForm.max_uses}
                  onChange={(event) => setInviteForm((prev) => ({ ...prev, max_uses: event.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 font-mono text-sm text-white outline-none focus:border-neon/40"
                />
              </label>
              <label className="block">
                <span className="mono-label">süre (gün)</span>
                <input
                  type="number"
                  min={0}
                  max={3650}
                  value={inviteForm.days}
                  onChange={(event) => setInviteForm((prev) => ({ ...prev, days: event.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 font-mono text-sm text-white outline-none focus:border-neon/40"
                />
              </label>
              <button
                type="submit"
                disabled={busy === "invite"}
                className="mt-auto flex h-10 items-center gap-2 rounded-xl bg-neon px-3.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 disabled:opacity-60"
              >
                {busy === "invite" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                üret
              </button>
            </div>
          </form>

          <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
              <h2 className="font-mono text-[11px] uppercase tracking-[0.18em] text-neon">davetler · {invites.length}</h2>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                {invites.filter((row) => row.valid).length} kullanılabilir
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-[13px]">
                <thead className="bg-white/[0.02] font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2.5">Kod</th>
                    <th className="px-4 py-2.5">Not</th>
                    <th className="px-4 py-2.5">Kullanım</th>
                    <th className="px-4 py-2.5">Geçerlilik</th>
                    <th className="px-4 py-2.5">Durum</th>
                    <th className="px-4 py-2.5 text-right">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((row) => (
                    <tr key={row.id} className="border-t border-white/[0.05]">
                      <td className="px-4 py-2.5 font-mono text-[12px] tracking-[0.12em] text-white">{row.code}</td>
                      <td className="px-4 py-2.5 text-[12px] text-muted-foreground">{row.note || "—"}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
                        {row.used_count || 0}/{row.max_uses <= 0 ? "∞" : row.max_uses}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[10.5px] text-muted-foreground">
                        {row.expires_at ? String(row.expires_at).slice(0, 10) : "süresiz"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={
                            row.valid
                              ? "rounded-md border border-neon/30 bg-neon/[0.08] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-neon"
                              : "rounded-md border border-white/[0.08] px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground"
                          }
                        >
                          {row.active === false
                            ? "kapalı"
                            : row.expired
                              ? "süresi doldu"
                              : row.exhausted
                                ? "doldu"
                                : "geçerli"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyInvite(row)}
                            title="Kodu kopyala"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground transition hover:border-neon/40 hover:text-neon"
                          >
                            <Copy className="h-3 w-3" /> kopyala
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleInvite(row)}
                            disabled={busy === row.id}
                            title={row.active === false ? "Yeniden aç" : "Kapat"}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground transition hover:border-signal-yellow/40 hover:text-signal-yellow disabled:opacity-40"
                          >
                            <Power className="h-3 w-3" /> {row.active === false ? "aç" : "kapat"}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteInvite(row)}
                            disabled={busy === row.id}
                            title="Daveti sil"
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground transition hover:border-signal-red/40 hover:text-signal-red disabled:opacity-40"
                          >
                            <Trash2 className="h-3 w-3" /> sil
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!invites.length && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                        Henüz davet kodu üretilmedi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {tab === "reports" && (
        <section className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
            <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neon">
              <Flag className="h-3.5 w-3.5" /> şikayetler · {reports.length}
            </h2>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {openReports.length} açık
            </span>
          </div>

          <div className="divide-y divide-white/[0.05]">
            {reports.map((row) => (
              <div key={row.id} className="flex flex-wrap items-start gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-[13px] text-white">
                    <span className="font-mono text-[11px] text-signal-yellow">
                      {row.target_handle ? `@${row.target_handle}` : row.target_type}
                    </span>
                    <span
                      className={
                        row.status === "open"
                          ? "rounded-md border border-signal-red/30 bg-signal-red/[0.08] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-signal-red"
                          : row.status === "resolved"
                            ? "rounded-md border border-neon/30 bg-neon/[0.08] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-neon"
                            : "rounded-md border border-white/[0.08] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground"
                      }
                    >
                      {row.status === "open" ? "açık" : row.status === "resolved" ? "çözüldü" : "yoksayıldı"}
                    </span>
                  </p>
                  <p className="mt-1 break-words text-[12.5px] text-muted-foreground [overflow-wrap:anywhere]">
                    {row.reason}
                  </p>
                  <p className="mt-1 font-mono text-[10px] text-muted-foreground/70">
                    {row.created_by || "—"} · {row.channel_slug ? `#${row.channel_slug} · ` : ""}
                    {row.created_date ? String(row.created_date).slice(0, 16).replace("T", " ") : ""}
                  </p>
                </div>

                {row.status === "open" && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setReportStatus(row, "resolved")}
                      disabled={busy === row.id}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-neon/30 bg-neon/[0.07] px-2.5 font-mono text-[9.5px] uppercase tracking-wider text-neon transition hover:bg-neon/[0.12] disabled:opacity-40"
                    >
                      <Check className="h-3 w-3" /> çöz
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportStatus(row, "dismissed")}
                      disabled={busy === row.id}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] px-2.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground transition hover:border-white/20 hover:text-white disabled:opacity-40"
                    >
                      <X className="h-3 w-3" /> yoksay
                    </button>
                  </div>
                )}
              </div>
            ))}

            {!reports.length && (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">Henüz şikayet yok.</p>
            )}
          </div>
        </section>
      )}

      {tab === "database" && (
        <section className="space-y-3">
          <div className="rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-5">
            <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neon">
              <Download className="h-3.5 w-3.5" /> yedek indir
            </h2>
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              Üyeler, profiller, kasalar, topluluklar, kanallar, mesajlar, bildirimler, şikayetler ve ayarlar tek JSON
              dosyasında indirilir. Dosya parola özetlerini içerir; güvenli bir yerde sakla.
            </p>
            <button
              type="button"
              onClick={exportDatabase}
              disabled={busy === "export"}
              className="mt-3 flex h-9 items-center gap-2 rounded-xl bg-neon px-3.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 disabled:opacity-60"
            >
              {busy === "export" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              veritabanını indir
            </button>
          </div>

          <div className="rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-5">
            <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-signal-yellow">
              <Upload className="h-3.5 w-3.5" /> yedek yükle
            </h2>
            <p className="mt-2 text-[12.5px] text-muted-foreground">
              Daha önce indirdiğin JSON yedeğini yükle. <span className="text-white">Birleştir</span> mevcut kayıtların
              üzerine aynı kimlikli kayıtları yazar; <span className="text-white">Değiştir</span> önce tüm verileri
              siler.
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <select
                value={importMode}
                onChange={(event) => setImportMode(event.target.value)}
                className="h-9 rounded-xl border border-white/[0.08] bg-[hsl(var(--card))] px-2.5 font-mono text-[10.5px] uppercase tracking-wider text-white outline-none focus:border-neon/40"
              >
                <option value="merge">birleştir</option>
                <option value="replace">değiştir</option>
              </select>

              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                onChange={(event) => importDatabase(event.target.files?.[0])}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={busy === "import"}
                className="flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] px-3.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-neon/40 hover:text-neon disabled:opacity-60"
              >
                {busy === "import" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                json seç ve yükle
              </button>
            </div>
          </div>
        </section>
      )}

      {tab === "settings" && settings && (
        <>
        <section className="mb-3 rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-5">
          <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neon">
            <Mail className="h-3.5 w-3.5" /> e-posta gönderimi
          </h2>

          <p className="mt-3 text-[12.5px] text-muted-foreground">
            {mail?.smtp_configured ? (
              <>
                SMTP:{" "}
                <span className="font-mono text-neon">
                  {mail.smtp_host} · {mail.from}
                </span>
              </>
            ) : (
              <span className="text-signal-yellow">
                SMTP tanımlı değil — doğrulama ve parola sıfırlama bağlantıları yalnızca sunucu konsoluna yazılıyor,
                e-posta gönderilmiyor. Sunucudaki .env dosyasında SMTP_HOST / SMTP_USER / SMTP_PASSWORD / SMTP_FROM
                alanlarını doldurup yeniden başlat.
              </span>
            )}
          </p>

          {mail?.recent?.length ? (
            <ul className="mt-3 space-y-1.5">
              {mail.recent.slice(0, 5).map((item, index) => (
                <li
                  key={`${item.at}-${index}`}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-mono text-[10px]"
                >
                  <span className={item.delivered ? "text-neon" : "text-signal-red"}>
                    {item.delivered ? "gönderildi" : "gönderilemedi"}
                  </span>
                  <span className="text-muted-foreground">
                    {" · "}
                    {item.to} · {item.subject} · {String(item.at).slice(0, 16).replace("T", " ")}
                  </span>
                  {item.error && <p className="mt-1 text-signal-red">{item.error}</p>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              bu sunucu açıldığından beri posta denenmedi
            </p>
          )}
        </section>

        <form onSubmit={saveSettings} className="space-y-3">
          <section className="rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-5">
            <h2 className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neon">
              <Settings2 className="h-3.5 w-3.5" /> site ayarları
            </h2>

            <label className="mt-4 block">
              <span className="mono-label">site adı</span>
              <input
                value={settings.site_name}
                onChange={(event) => setSettings((prev) => ({ ...prev, site_name: event.target.value }))}
                className="mt-1.5 h-10 w-full max-w-sm rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40"
              />
              <span className="mt-1 block font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">
                kenar çubuğundaki logo yazısı
              </span>
            </label>

            <label className="mt-3 block">
              <span className="mono-label">duyuru</span>
              <textarea
                value={settings.motd}
                onChange={(event) => setSettings((prev) => ({ ...prev, motd: event.target.value }))}
                rows={2}
                className="mt-1.5 w-full max-w-xl resize-none rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white outline-none focus:border-neon/40"
              />
              <span className="mt-1 block font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground">
                her sayfanın üstünde şerit olarak görünür
              </span>
            </label>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mono-label">kayıt yöntemi</span>
                <select
                  value={settings.registration_method || ""}
                  onChange={(event) => setSettings((prev) => ({ ...prev, registration_method: event.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-[hsl(var(--card))] px-3 text-sm text-white outline-none focus:border-neon/40"
                >
                  <option value="">.env varsayılanı ({summary?.registration?.method || "email"})</option>
                  <option value="email">e-posta + doğrulama bağlantısı</option>
                  <option value="invite">davet kodu</option>
                  <option value="captcha">kendi captcha'mız</option>
                  <option value="telegram">Telegram botu</option>
                  <option value="open">yalnızca kullanıcı adı + parola</option>
                </select>
              </label>

              <label className="block">
                <span className="mono-label">captcha</span>
                <select
                  value={settings.captcha_provider || ""}
                  onChange={(event) => setSettings((prev) => ({ ...prev, captcha_provider: event.target.value }))}
                  className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-[hsl(var(--card))] px-3 text-sm text-white outline-none focus:border-neon/40"
                >
                  <option value="">.env varsayılanı ({summary?.registration?.captcha || "none"})</option>
                  <option value="none">kapalı</option>
                  <option value="local">kendi captcha'mız (yazıyı kutuya yaz)</option>
                  <option value="turnstile">Cloudflare Turnstile</option>
                </select>
              </label>
            </div>

            <p className="mt-2 text-[11.5px] text-muted-foreground">
              Telegram {summary?.registration?.telegram_ready ? "hazır" : "ayarlı değil — .env'de TELEGRAM_BOT_TOKEN ve TELEGRAM_BOT_USERNAME gerekli"}.
              Turnstile için .env'de TURNSTILE_SITE_KEY + TURNSTILE_SECRET_KEY gerekli. Buradaki seçim .env değerini geçersiz kılar.
            </p>

            <div className="mt-4 space-y-2">
              {[
                { key: "allow_registration", label: "Yeni üye kaydı açık" },
                { key: "require_email_verification", label: "Kayıtta e-posta doğrulaması gerekli" },
                { key: "allow_communities", label: "Topluluk oluşturma açık" },
                { key: "allow_channels", label: "Kanal oluşturma açık" },
              ].map(({ key, label }) => (
                <label
                  key={key}
                  className="flex max-w-sm items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                >
                  <span className="text-[13px] text-white">{label}</span>
                  <input
                    type="checkbox"
                    checked={!!settings[key]}
                    onChange={(event) => setSettings((prev) => ({ ...prev, [key]: event.target.checked }))}
                    className="h-4 w-4 accent-[hsl(var(--primary))]"
                  />
                </label>
              ))}
            </div>

            <p className="mt-3 max-w-lg text-[12px] text-muted-foreground">
              E-posta doğrulaması yalnızca <span className="text-white">e-posta</span> yönteminde uygulanır: üye bağlantıyı
              açmadan giriş yapamaz. SMTP tanımlı değilse bağlantı sunucu konsoluna yazılır; Üyeler sekmesinden elle de
              doğrulayabilirsin. Davet kodu, captcha ve Telegram yöntemlerinde hesap kayıt anında doğrulanmış sayılır
              (Telegram'da bot onayından sonra).
            </p>
          </section>

          <button
            type="submit"
            disabled={busy === "settings"}
            className="flex h-10 items-center gap-2 rounded-xl bg-neon px-4 font-mono text-[10.5px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 disabled:opacity-60"
          >
            {busy === "settings" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            ayarları kaydet
          </button>
        </form>
        </>
      )}

      <ModerationDialog
        open={!!moderation}
        onClose={() => setModeration(null)}
        target={moderation}
        onDone={async () => {
          setModeration(null);
          await load();
        }}
      />
    </div>
  );
}

// Ban / susturma süresi ve nedeni. Süre boş bırakılırsa ceza süresizdir.
function ModerationDialog({ open, onClose, target, onDone }) {
  const [reason, setReason] = useState("");
  const [hours, setHours] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setHours("");
    }
  }, [open]);

  const isBan = target?.action === "ban";

  async function submit(event) {
    event.preventDefault();
    if (!target) return;
    setBusy(true);
    try {
      await api.admin.setModeration(target.row.id, {
        action: target.action,
        hours: hours ? Number(hours) : null,
        reason: reason.trim(),
      });
      toast.success(
        isBan ? `${target.row.email} banlandı` : `${target.row.email} susturuldu`,
      );
      await onDone();
    } catch (error) {
      toast.error(error?.message || "İşlem yapılamadı");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md border-white/[0.08] bg-[hsl(var(--card))]">
        <DialogHeader>
          <DialogTitle className="font-heading text-lg text-white">
            {isBan ? "Kullanıcıyı banla" : "Kullanıcıyı sustur"}
          </DialogTitle>
          <DialogDescription className="text-[12.5px] text-muted-foreground">
            {isBan
              ? "Banlı kullanıcı giriş yapamaz ve mevcut oturumu kapatılır."
              : "Susturulmuş kullanıcı okuyabilir ama mesaj, kanal veya topluluk oluşturamaz."}{" "}
            <span className="font-mono text-white">
              {target?.row?.email || (target?.row?.username ? `@${target.row.username}` : "—")}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="mono-label">süre</span>
            <select
              value={hours}
              onChange={(event) => setHours(event.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-[hsl(var(--card))] px-3 text-sm text-white outline-none focus:border-neon/40"
            >
              {HOUR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mono-label">neden (isteğe bağlı)</span>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              maxLength={200}
              className="mt-1.5 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white outline-none focus:border-neon/40"
            />
          </label>

          <DialogFooter className="gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-xl border border-white/[0.08] px-3.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-white/20 hover:text-white"
            >
              vazgeç
            </button>
            <button
              type="submit"
              disabled={busy}
              className={
                isBan
                  ? "flex h-9 items-center gap-2 rounded-xl bg-signal-red px-3.5 font-mono text-[10px] font-medium uppercase tracking-wider text-white transition hover:bg-signal-red/90 disabled:opacity-60"
                  : "flex h-9 items-center gap-2 rounded-xl bg-signal-yellow px-3.5 font-mono text-[10px] font-medium uppercase tracking-wider text-black transition hover:bg-signal-yellow/90 disabled:opacity-60"
              }
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isBan ? <Ban className="h-3.5 w-3.5" /> : <MicOff className="h-3.5 w-3.5" />}
              {isBan ? "banla" : "sustur"}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
