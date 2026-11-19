import { c as useSite, l as useAuth } from "./router-CRnjuvSx.js";
import { n as useVault, t as VaultProvider } from "./VaultContext-mbaTeg3u.js";
import { t as cn } from "./utils-Cet5ilrL.js";
import { t as HandleAvatar } from "./HandleAvatar-CMauiase.js";
import { n as useUnreadNotifications, t as useChannels } from "./useChannels-BQIHdmvq.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { t as Button } from "./button-D2C8FyBM.js";
import { t as LanguageToggle } from "./LanguageToggle-QcxRiqlP.js";
import { S as handleTaken, r as normalizeHandle } from "./krypt-ELaGncLW.js";
import * as React from "react";
import { useState } from "react";
import { Link, Outlet, useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { cva } from "class-variance-authority";
import { toast } from "sonner";
import { Bell, Fingerprint, Hash, House, KeyRound, Loader2, LockKeyhole, LockOpen, LogOut, Mail, Megaphone, Menu, Plus, Radio, Search, Settings, ShieldCheck, Unlock, Users, X } from "lucide-react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
// src/components/ui/sheet.jsx
var Sheet = SheetPrimitive.Root;
var SheetPortal = SheetPrimitive.Portal;
var SheetOverlay = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SheetPrimitive.Overlay, {
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;
var sheetVariants = cva("fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out", {
	variants: { side: {
		top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
		bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
		left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
		right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
	} },
	defaultVariants: { side: "right" }
});
var SheetContent = React.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ jsxs(SheetPortal, { children: [/* @__PURE__ */ jsx(SheetOverlay, {}), /* @__PURE__ */ jsxs(SheetPrimitive.Content, {
	ref,
	className: cn(sheetVariants({ side }), className),
	...props,
	children: [/* @__PURE__ */ jsxs(SheetPrimitive.Close, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
		children: [/* @__PURE__ */ jsx(X, { className: "h-4 w-4" }), /* @__PURE__ */ jsx("span", {
			className: "sr-only",
			children: "Close"
		})]
	}), children]
})] }));
SheetContent.displayName = SheetPrimitive.Content.displayName;
var SheetHeader = ({ className, ...props }) => /* @__PURE__ */ jsx("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
SheetHeader.displayName = "SheetHeader";
var SheetFooter = ({ className, ...props }) => /* @__PURE__ */ jsx("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
SheetFooter.displayName = "SheetFooter";
var SheetTitle = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SheetPrimitive.Title, {
	ref,
	className: cn("text-lg font-semibold text-foreground", className),
	...props
}));
SheetTitle.displayName = SheetPrimitive.Title.displayName;
var SheetDescription = React.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ jsx(SheetPrimitive.Description, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
SheetDescription.displayName = SheetPrimitive.Description.displayName;
// src/components/krypt/Sidebar.jsx
var NAV = [
	{
		to: "/",
		key: "nav.feed",
		icon: House,
		exact: true
	},
	{
		to: "/channels",
		key: "nav.channels",
		icon: Hash
	},
	{
		to: "/communities",
		key: "nav.communities",
		icon: Users
	},
	{
		to: "/messages",
		key: "nav.messages",
		icon: Mail
	},
	{
		to: "/notifications",
		key: "nav.notifications",
		icon: Bell
	}
];
function Sidebar({ user, onNavigate }) {
	const { t } = useLang();
	const { site_name: siteName } = useSite();
	const { channels } = useChannels();
	const { profile, locked } = useVault();
	const visible = channels.filter((channel) => channel.kind !== "direct");
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ jsxs(Link, {
				to: "/",
				onClick: onNavigate,
				className: "flex items-center gap-3 px-5 pb-5 pt-6",
				children: [/* @__PURE__ */ jsxs("span", {
					className: "relative grid h-10 w-10 place-items-center rounded-[14px] border border-neon/45 bg-neon/[0.07] krypt-glow",
					children: [/* @__PURE__ */ jsx("span", { className: "absolute inset-1 rounded-[9px] border border-neon/15" }), /* @__PURE__ */ jsx(LockKeyhole, {
						className: "relative h-4 w-4 text-neon",
						strokeWidth: 1.8
					})]
				}), /* @__PURE__ */ jsxs("span", {
					className: "leading-tight",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "block truncate font-heading text-lg font-bold tracking-[0.14em] text-white",
						children: [siteName || "KRYPT", /* @__PURE__ */ jsx("span", {
							className: "text-neon",
							children: "/"
						})]
					}), /* @__PURE__ */ jsx("span", {
						className: "block font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground",
						children: t("common.tagline")
					})]
				})]
			}),
			/* @__PURE__ */ jsx("nav", {
				className: "space-y-1 px-3",
				children: NAV.map(({ to, key, icon: Icon, exact }) => /* @__PURE__ */ jsxs(Link, {
					to,
					onClick: onNavigate,
					activeOptions: { exact: !!exact },
					className: "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition hover:bg-white/[0.04] hover:text-white",
					activeProps: { className: "group flex items-center gap-3 rounded-xl border border-neon/25 bg-neon/[0.07] px-3 py-2.5 text-sm text-neon" },
					children: [/* @__PURE__ */ jsx(Icon, {
						className: "h-[17px] w-[17px]",
						strokeWidth: 1.8
					}), /* @__PURE__ */ jsx("span", {
						className: "font-medium",
						children: t(key)
					})]
				}, to))
			}),
			user?.role === "admin" && /* @__PURE__ */ jsx("div", {
				className: "mt-3 px-3",
				children: /* @__PURE__ */ jsxs(Link, {
					to: "/admin",
					onClick: onNavigate,
					className: "flex items-center gap-3 rounded-xl border border-signal-yellow/25 bg-signal-yellow/[0.06] px-3 py-2.5 text-sm text-signal-yellow transition hover:bg-signal-yellow/[0.1]",
					children: [/* @__PURE__ */ jsx(ShieldCheck, {
						className: "h-[17px] w-[17px]",
						strokeWidth: 1.8
					}), /* @__PURE__ */ jsx("span", {
						className: "font-medium",
						children: t("nav.admin")
					})]
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "mt-6 flex items-center justify-between px-5",
				children: [/* @__PURE__ */ jsx("span", {
					className: "mono-label",
					children: t("sidebar.channels")
				}), /* @__PURE__ */ jsx(Link, {
					to: "/channels",
					onClick: onNavigate,
					className: "grid h-6 w-6 place-items-center rounded-md border border-white/10 text-muted-foreground transition hover:border-neon/40 hover:text-neon",
					"aria-label": t("sidebar.createChannel"),
					children: /* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" })
				})]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "mt-3 flex-1 overflow-y-auto px-3 pb-4",
				children: /* @__PURE__ */ jsxs("ul", {
					className: "space-y-0.5",
					children: [visible.slice(0, 20).map((channel) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
						to: "/channels/$slug",
						params: { slug: channel.slug },
						onClick: onNavigate,
						className: "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition hover:bg-white/[0.04] hover:text-white",
						children: [channel.visibility === "private" ? /* @__PURE__ */ jsx(LockKeyhole, {
							className: "h-3.5 w-3.5 shrink-0 text-neon-2/80",
							strokeWidth: 1.8
						}) : /* @__PURE__ */ jsx(Hash, {
							className: "h-3.5 w-3.5 shrink-0 opacity-60",
							strokeWidth: 1.8
						}), /* @__PURE__ */ jsx("span", {
							className: "truncate",
							children: channel.name
						})]
					}) }, channel.id)), !visible.length && /* @__PURE__ */ jsx("li", {
						className: "px-3 py-2 font-mono text-[11px] text-muted-foreground/60",
						children: t("sidebar.loadingChannels")
					})]
				})
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "border-t border-white/[0.06] px-3 py-3",
				children: [/* @__PURE__ */ jsxs(Link, {
					to: "/settings",
					onClick: onNavigate,
					className: "mb-2 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 transition hover:border-neon/25",
					children: [/* @__PURE__ */ jsxs("span", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ jsx(KeyRound, {
							className: "h-3.5 w-3.5 text-neon",
							strokeWidth: 1.8
						}), /* @__PURE__ */ jsx("span", {
							className: "mono-label",
							children: t("sidebar.vault")
						})]
					}), /* @__PURE__ */ jsxs("span", {
						className: locked ? "flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-signal-yellow" : "flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-neon",
						children: [locked ? /* @__PURE__ */ jsx(LockKeyhole, { className: "h-3 w-3" }) : /* @__PURE__ */ jsx(LockOpen, { className: "h-3 w-3" }), locked ? t("common.locked") : t("common.open")]
					})]
				}), /* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-2.5 rounded-xl px-2 py-1.5",
					children: [
						/* @__PURE__ */ jsx(HandleAvatar, {
							name: profile?.handle || user?.full_name || user?.email,
							size: 32
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ jsx("p", {
								className: "truncate text-[13px] font-medium text-white",
								children: profile?.display_name || user?.full_name || t("common.user")
							}), /* @__PURE__ */ jsx("p", {
								className: "truncate font-mono text-[10px] text-muted-foreground",
								children: profile?.handle ? `@${profile.handle}` : user?.email
							})]
						}),
						/* @__PURE__ */ jsx(Radio, { className: "ml-auto h-3 w-3 text-neon/60" })
					]
				})]
			})
		]
	});
}
// src/components/krypt/Topbar.jsx
function Topbar({ user, onOpenMenu }) {
	const { t } = useLang();
	const navigate = useNavigate();
	const { logout } = useAuth();
	const { profile } = useVault();
	const unread = useUnreadNotifications();
	const [query, setQuery] = useState("");
	return /* @__PURE__ */ jsx("header", {
		className: "sticky top-0 z-30 border-b border-white/[0.07] border-t-2 border-t-neon/70 bg-[hsl(var(--background))]/90 backdrop-blur-xl",
		children: /* @__PURE__ */ jsxs("div", {
			className: "flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8",
			children: [
				/* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: onOpenMenu,
					className: "grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-muted-foreground lg:hidden",
					"aria-label": t("topbar.menu"),
					children: /* @__PURE__ */ jsx(Menu, { className: "h-4 w-4" })
				}),
				/* @__PURE__ */ jsxs("form", {
					onSubmit: (event) => {
						event.preventDefault();
						navigate({
							to: "/",
							search: { q: query.trim() || void 0 }
						});
					},
					className: "relative flex-1 sm:max-w-sm",
					children: [/* @__PURE__ */ jsx(Search, { className: "pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ jsx("input", {
						value: query,
						onChange: (event) => setQuery(event.target.value),
						placeholder: t("topbar.search"),
						"aria-label": t("topbar.searchAria"),
						className: "h-9 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] pl-9 pr-3 font-mono text-[11px] text-white outline-none transition placeholder:text-muted-foreground/70 focus:border-neon/40"
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "ml-auto flex items-center gap-1.5",
					children: [
						/* @__PURE__ */ jsx(LanguageToggle, { className: "mr-1" }),
						/* @__PURE__ */ jsxs(Link, {
							to: "/channels",
							className: "hidden h-9 items-center gap-1.5 rounded-xl bg-neon px-3.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 sm:flex",
							children: [
								/* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }),
								" ",
								t("topbar.channel")
							]
						}),
						/* @__PURE__ */ jsxs(Link, {
							to: "/notifications",
							className: "relative grid h-9 w-9 place-items-center rounded-xl border border-white/[0.08] text-muted-foreground transition hover:border-neon/30 hover:text-neon",
							"aria-label": t("topbar.notifications"),
							children: [/* @__PURE__ */ jsx(Bell, { className: "h-4 w-4" }), unread > 0 && /* @__PURE__ */ jsx("span", {
								className: "absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-neon-2 px-1 font-mono text-[9px] font-medium text-black",
								children: unread > 9 ? "9+" : unread
							})]
						}),
						/* @__PURE__ */ jsx(Link, {
							to: "/settings",
							className: "hidden h-9 w-9 place-items-center rounded-xl border border-white/[0.08] text-muted-foreground transition hover:border-neon/30 hover:text-neon sm:grid",
							"aria-label": t("topbar.settings"),
							children: /* @__PURE__ */ jsx(Settings, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "ml-1 hidden items-center gap-2 md:flex",
							children: [/* @__PURE__ */ jsx(HandleAvatar, {
								name: profile?.handle || user?.full_name || user?.email,
								size: 32
							}), /* @__PURE__ */ jsx(Button, {
								variant: "ghost",
								size: "sm",
								onClick: () => logout(),
								className: "h-9 rounded-xl border border-white/[0.08] px-2.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-white",
								"aria-label": t("topbar.logout"),
								children: /* @__PURE__ */ jsx(LogOut, { className: "h-3.5 w-3.5" })
							})]
						})
					]
				})
			]
		})
	});
}
// src/components/krypt/VaultSetup.jsx
function VaultSetup() {
	const { t } = useLang();
	const { setup } = useVault();
	const [form, setForm] = useState({
		handle: "",
		displayName: "",
		passphrase: "",
		confirm: ""
	});
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	const update = (field) => (event) => setForm((prev) => ({
		...prev,
		[field]: event.target.value
	}));
	async function submit(event) {
		event.preventDefault();
		setError("");
		const handle = normalizeHandle(form.handle);
		if (handle.length < 3) return setError(t("vault.errHandleShort"));
		if (form.passphrase.length < 8) return setError(t("vault.errPassShort"));
		if (form.passphrase !== form.confirm) return setError(t("vault.errMismatch"));
		setBusy(true);
		try {
			if (await handleTaken(handle)) {
				setError(t("vault.errTaken"));
				return;
			}
			await setup({
				handle,
				displayName: form.displayName.trim() || handle,
				passphrase: form.passphrase
			});
			toast.success(t("vault.created"));
		} catch (err) {
			setError(err?.message || t("vault.errCreate"));
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ jsx("div", {
		className: "mx-auto w-full max-w-lg",
		children: /* @__PURE__ */ jsxs("div", {
			className: "relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[hsl(var(--card))]/70 p-6 sm:p-8",
			children: [/* @__PURE__ */ jsx("div", { className: "grid-backdrop pointer-events-none absolute inset-0 opacity-30" }), /* @__PURE__ */ jsxs("div", {
				className: "relative",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "grid h-11 w-11 place-items-center rounded-2xl border border-neon/40 bg-neon/[0.08] krypt-glow",
						children: /* @__PURE__ */ jsx(KeyRound, {
							className: "h-5 w-5 text-neon",
							strokeWidth: 1.8
						})
					}),
					/* @__PURE__ */ jsx("h1", {
						className: "mt-5 font-heading text-xl font-semibold tracking-[-0.02em] text-white",
						children: t("vault.setupTitle")
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-2 text-sm leading-relaxed text-muted-foreground",
						children: t("vault.setupDesc")
					}),
					/* @__PURE__ */ jsxs("form", {
						onSubmit: submit,
						className: "mt-6 space-y-3",
						children: [
							/* @__PURE__ */ jsxs("label", {
								className: "block",
								children: [/* @__PURE__ */ jsx("span", {
									className: "mono-label",
									children: t("vault.handle")
								}), /* @__PURE__ */ jsxs("div", {
									className: "mt-1.5 flex items-center rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 focus-within:border-neon/40",
									children: [/* @__PURE__ */ jsx("span", {
										className: "font-mono text-sm text-neon",
										children: "@"
									}), /* @__PURE__ */ jsx("input", {
										value: form.handle,
										onChange: update("handle"),
										placeholder: t("vault.handlePlaceholder"),
										autoComplete: "username",
										className: "h-10 w-full bg-transparent px-2 font-mono text-sm text-white outline-none placeholder:text-muted-foreground/60"
									})]
								})]
							}),
							/* @__PURE__ */ jsxs("label", {
								className: "block",
								children: [/* @__PURE__ */ jsx("span", {
									className: "mono-label",
									children: t("vault.displayName")
								}), /* @__PURE__ */ jsx("input", {
									value: form.displayName,
									onChange: update("displayName"),
									placeholder: t("vault.displayPlaceholder"),
									className: "mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40 placeholder:text-muted-foreground/60"
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "grid gap-3 sm:grid-cols-2",
								children: [/* @__PURE__ */ jsxs("label", {
									className: "block",
									children: [/* @__PURE__ */ jsx("span", {
										className: "mono-label",
										children: t("vault.passphrase")
									}), /* @__PURE__ */ jsx("input", {
										type: "password",
										value: form.passphrase,
										onChange: update("passphrase"),
										autoComplete: "new-password",
										placeholder: t("vault.passphrasePlaceholder"),
										className: "mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40 placeholder:text-muted-foreground/60"
									})]
								}), /* @__PURE__ */ jsxs("label", {
									className: "block",
									children: [/* @__PURE__ */ jsx("span", {
										className: "mono-label",
										children: t("vault.confirm")
									}), /* @__PURE__ */ jsx("input", {
										type: "password",
										value: form.confirm,
										onChange: update("confirm"),
										autoComplete: "new-password",
										placeholder: t("vault.confirmPlaceholder"),
										className: "mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40 placeholder:text-muted-foreground/60"
									})]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "flex items-start gap-2 rounded-xl border border-signal-yellow/25 bg-signal-yellow/[0.06] px-3 py-2.5",
								children: [/* @__PURE__ */ jsx(ShieldCheck, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-yellow" }), /* @__PURE__ */ jsx("p", {
									className: "text-[11.5px] leading-relaxed text-signal-yellow/90",
									children: t("vault.warning")
								})]
							}),
							error && /* @__PURE__ */ jsx("p", {
								className: "rounded-xl border border-signal-red/30 bg-signal-red/[0.07] px-3 py-2 text-[12px] text-signal-red",
								children: error
							}),
							/* @__PURE__ */ jsxs("button", {
								type: "submit",
								disabled: busy,
								className: "flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neon font-mono text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 disabled:opacity-60",
								children: [/* @__PURE__ */ jsx(LockKeyhole, { className: "h-4 w-4" }), busy ? t("vault.creating") : t("vault.create")]
							})
						]
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "mt-4 flex items-center justify-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70",
						children: [/* @__PURE__ */ jsx(Fingerprint, { className: "h-3 w-3" }), " RSA-4096 · AES-256-GCM · PBKDF2"]
					})
				]
			})]
		})
	});
}
// src/components/krypt/VaultUnlock.jsx
function VaultUnlock() {
	const { t } = useLang();
	const { unlock, profile, vault } = useVault();
	const [passphrase, setPassphrase] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function submit(event) {
		event.preventDefault();
		setError("");
		setBusy(true);
		try {
			await unlock(passphrase);
			setPassphrase("");
		} catch (err) {
			setError(err?.code === "BAD_PASSPHRASE" ? t("vault.errBadPass") : err?.message || t("vault.errUnlock"));
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ jsx("div", {
		className: "mx-auto w-full max-w-md",
		children: /* @__PURE__ */ jsxs("div", {
			className: "relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[hsl(var(--card))]/70 p-6 sm:p-8",
			children: [/* @__PURE__ */ jsx("div", { className: "grid-backdrop pointer-events-none absolute inset-0 opacity-30" }), /* @__PURE__ */ jsxs("div", {
				className: "relative",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: "grid h-11 w-11 place-items-center rounded-2xl border border-neon-2/40 bg-neon-2/[0.08]",
						children: /* @__PURE__ */ jsx(LockKeyhole, {
							className: "h-5 w-5 text-neon-2",
							strokeWidth: 1.8
						})
					}),
					/* @__PURE__ */ jsx("h1", {
						className: "mt-5 font-heading text-xl font-semibold tracking-[-0.02em] text-white",
						children: t("vault.lockedTitle")
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-2 text-sm leading-relaxed text-muted-foreground",
						children: t("vault.lockedDesc")
					}),
					profile?.handle && /* @__PURE__ */ jsxs("p", {
						className: "mt-3 inline-flex items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-2.5 py-1 font-mono text-[11px] text-white",
						children: [/* @__PURE__ */ jsx("span", {
							className: "text-neon",
							children: "@"
						}), profile.handle]
					}),
					/* @__PURE__ */ jsxs("form", {
						onSubmit: submit,
						className: "mt-5 space-y-3",
						children: [
							/* @__PURE__ */ jsx("input", {
								type: "password",
								value: passphrase,
								onChange: (event) => setPassphrase(event.target.value),
								placeholder: t("vault.passphrasePlaceholderShort"),
								autoComplete: "current-password",
								autoFocus: true,
								className: "h-11 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40 placeholder:text-muted-foreground/60"
							}),
							error && /* @__PURE__ */ jsx("p", {
								className: "rounded-xl border border-signal-red/30 bg-signal-red/[0.07] px-3 py-2 text-[12px] text-signal-red",
								children: error
							}),
							/* @__PURE__ */ jsxs("button", {
								type: "submit",
								disabled: busy || !passphrase,
								className: "flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-neon font-mono text-[11px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 disabled:opacity-50",
								children: [
									/* @__PURE__ */ jsx(Unlock, { className: "h-4 w-4" }),
									" ",
									busy ? t("vault.unlocking") : t("vault.unlock")
								]
							})
						]
					}),
					vault?.fingerprint && /* @__PURE__ */ jsxs("p", {
						className: "mt-4 flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-muted-foreground/70",
						children: [
							/* @__PURE__ */ jsx(Fingerprint, { className: "h-3 w-3" }),
							" ",
							vault.fingerprint
						]
					})
				]
			})]
		})
	});
}
// src/components/krypt/VaultGate.jsx
function VaultGate({ children }) {
	const { t } = useLang();
	const { loading, needsSetup, locked } = useVault();
	if (loading) return /* @__PURE__ */ jsx("div", {
		className: "grid min-h-[50vh] place-items-center",
		children: /* @__PURE__ */ jsxs("div", {
			className: "flex flex-col items-center gap-3",
			children: [/* @__PURE__ */ jsx(Loader2, { className: "h-5 w-5 animate-spin text-neon" }), /* @__PURE__ */ jsx("span", {
				className: "mono-label",
				children: t("vault.checking")
			})]
		})
	});
	if (needsSetup) return /* @__PURE__ */ jsx(VaultSetup, {});
	if (locked) return /* @__PURE__ */ jsx(VaultUnlock, {});
	return children;
}
// src/components/krypt/KryptShell.jsx
function KryptShell({ children }) {
	const { user } = useAuth();
	const { motd } = useSite();
	const [menuOpen, setMenuOpen] = useState(false);
	return /* @__PURE__ */ jsx(VaultProvider, { children: /* @__PURE__ */ jsxs("div", {
		className: "min-h-screen",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "mx-auto flex w-full max-w-[1560px]",
			children: [/* @__PURE__ */ jsx("aside", {
				className: "sticky top-0 hidden h-screen w-[266px] shrink-0 border-r border-white/[0.06] bg-[hsl(var(--sidebar-background))]/60 backdrop-blur-sm lg:block",
				children: /* @__PURE__ */ jsx(Sidebar, { user })
			}), /* @__PURE__ */ jsxs("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ jsx(Topbar, {
					user,
					onOpenMenu: () => setMenuOpen(true)
				}), /* @__PURE__ */ jsxs("main", {
					className: "px-4 pb-20 pt-5 sm:px-6 lg:px-8",
					children: [motd?.trim() && /* @__PURE__ */ jsxs("div", {
						className: "mb-4 flex items-start gap-2.5 rounded-2xl border border-signal-yellow/25 bg-signal-yellow/[0.06] px-3.5 py-2.5",
						children: [/* @__PURE__ */ jsx(Megaphone, { className: "mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-yellow" }), /* @__PURE__ */ jsx("p", {
							className: "min-w-0 break-words text-[12.5px] leading-relaxed text-signal-yellow [overflow-wrap:anywhere]",
							children: motd
						})]
					}), /* @__PURE__ */ jsx(VaultGate, { children })]
				})]
			})]
		}), /* @__PURE__ */ jsx(Sheet, {
			open: menuOpen,
			onOpenChange: setMenuOpen,
			children: /* @__PURE__ */ jsx(SheetContent, {
				side: "left",
				className: "w-[280px] border-white/[0.08] bg-[hsl(var(--sidebar-background))] p-0",
				children: /* @__PURE__ */ jsx(Sidebar, {
					user,
					onNavigate: () => setMenuOpen(false)
				})
			})
		})]
	}) });
}
// src/routes/_authed.jsx?tsr-split=component
function AuthedLayout() {
	return /* @__PURE__ */ jsx(KryptShell, { children: /* @__PURE__ */ jsx(Outlet, {}) });
}
export { AuthedLayout as component };
