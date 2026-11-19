import { l as useAuth } from "./router-CRnjuvSx.js";
import { n as useVault } from "./VaultContext-mbaTeg3u.js";
import { F as updateProfile } from "./krypt-ELaGncLW.js";
import { t as HandleAvatar } from "./HandleAvatar-CMauiase.js";
import { t as LanguageToggle } from "./LanguageToggle-QcxRiqlP.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { Fingerprint, KeyRound, Loader2, LockKeyhole, LockOpen, LogOut, ShieldCheck } from "lucide-react";
// src/routes/_authed/settings.jsx?tsr-split=component
function SettingsPage() {
	const { t } = useLang();
	const { user, logout } = useAuth();
	const { profile, vault, locked, lock, reload } = useVault();
	const [displayName, setDisplayName] = useState(profile?.display_name || "");
	const [busy, setBusy] = useState(false);
	async function save() {
		if (!profile) return;
		setBusy(true);
		try {
			await updateProfile(profile.id, { display_name: displayName.trim() || profile.handle });
			await reload();
			toast.success(t("settings.updated"));
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto w-full max-w-2xl space-y-3",
		children: [
			/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("span", {
				className: "mono-label flex items-center gap-2",
				children: [
					/* @__PURE__ */ jsx("span", { className: "signal-dot" }),
					" ",
					t("settings.label")
				]
			}), /* @__PURE__ */ jsx("h1", {
				className: "mt-2 font-heading text-2xl font-semibold tracking-[-0.03em] text-white",
				children: t("settings.title")
			})] }),
			/* @__PURE__ */ jsxs("section", {
				className: "rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-5",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-3",
					children: [/* @__PURE__ */ jsx(HandleAvatar, {
						name: profile?.handle || user?.email,
						size: 44
					}), /* @__PURE__ */ jsxs("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ jsx("p", {
							className: "truncate text-[15px] font-medium text-white",
							children: profile?.display_name || user?.full_name || t("common.user")
						}), /* @__PURE__ */ jsxs("p", {
							className: "truncate font-mono text-[11px] text-muted-foreground",
							children: [
								"@",
								profile?.handle || "—",
								" · ",
								user?.email
							]
						})]
					})]
				}), /* @__PURE__ */ jsx("div", {
					className: "mt-4 space-y-2",
					children: /* @__PURE__ */ jsxs("label", {
						className: "block",
						children: [/* @__PURE__ */ jsx("span", {
							className: "mono-label",
							children: t("settings.displayName")
						}), /* @__PURE__ */ jsxs("div", {
							className: "mt-1.5 flex gap-2",
							children: [/* @__PURE__ */ jsx("input", {
								value: displayName,
								onChange: (event) => setDisplayName(event.target.value),
								className: "h-10 flex-1 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40"
							}), /* @__PURE__ */ jsxs("button", {
								type: "button",
								onClick: save,
								disabled: busy,
								className: "flex h-10 items-center gap-2 rounded-xl bg-neon px-4 font-mono text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 disabled:opacity-60",
								children: [
									busy && /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
									" ",
									t("settings.save")
								]
							})]
						})]
					})
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-5",
				children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("h2", {
					className: "mono-label",
					children: t("settings.language")
				}), /* @__PURE__ */ jsx("p", {
					className: "mt-1.5 text-[12.5px] text-muted-foreground",
					children: t("settings.languageDesc")
				})] }), /* @__PURE__ */ jsx(LanguageToggle, {})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-5",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center justify-between gap-3",
						children: [/* @__PURE__ */ jsxs("h2", {
							className: "flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neon",
							children: [
								/* @__PURE__ */ jsx(KeyRound, { className: "h-3.5 w-3.5" }),
								" ",
								t("settings.vault")
							]
						}), /* @__PURE__ */ jsxs("span", {
							className: locked ? "flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-yellow" : "flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neon",
							children: [locked ? /* @__PURE__ */ jsx(LockKeyhole, { className: "h-3 w-3" }) : /* @__PURE__ */ jsx(LockOpen, { className: "h-3 w-3" }), locked ? t("common.locked") : t("common.open")]
						})]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-3 text-[13px] leading-relaxed text-muted-foreground",
						children: t("settings.vaultDesc")
					}),
					vault?.fingerprint && /* @__PURE__ */ jsxs("p", {
						className: "mt-3 flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-mono text-[10.5px] tracking-wider text-muted-foreground",
						children: [
							/* @__PURE__ */ jsx(Fingerprint, { className: "h-3 w-3 text-neon" }),
							" ",
							vault.fingerprint
						]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "mt-4 flex flex-wrap gap-2",
						children: [!locked && /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => {
								lock();
								toast.success(t("settings.vaultLocked"));
							},
							className: "flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] px-3.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-signal-yellow/40 hover:text-signal-yellow",
							children: [
								/* @__PURE__ */ jsx(LockKeyhole, { className: "h-3.5 w-3.5" }),
								" ",
								t("settings.lockVault")
							]
						}), /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => logout(),
							className: "flex h-9 items-center gap-2 rounded-xl border border-white/[0.08] px-3.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-signal-red/40 hover:text-signal-red",
							children: [
								/* @__PURE__ */ jsx(LogOut, { className: "h-3.5 w-3.5" }),
								" ",
								t("settings.logout")
							]
						})]
					})
				]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/40 p-5",
				children: [/* @__PURE__ */ jsxs("h2", {
					className: "flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground",
					children: [
						/* @__PURE__ */ jsx(ShieldCheck, { className: "h-3.5 w-3.5 text-neon" }),
						" ",
						t("settings.encryption")
					]
				}), /* @__PURE__ */ jsxs("ul", {
					className: "mt-3 space-y-1.5 font-mono text-[11px] leading-relaxed text-muted-foreground",
					children: [
						/* @__PURE__ */ jsx("li", { children: t("settings.enc1") }),
						/* @__PURE__ */ jsx("li", { children: t("settings.enc2") }),
						/* @__PURE__ */ jsx("li", { children: t("settings.enc3") }),
						/* @__PURE__ */ jsx("li", { children: t("settings.enc4") }),
						/* @__PURE__ */ jsx("li", { children: t("settings.enc5") })
					]
				})]
			})
		]
	});
}
export { SettingsPage as component };
