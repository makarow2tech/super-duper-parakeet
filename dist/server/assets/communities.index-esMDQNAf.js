import { l as useAuth } from "./router-CRnjuvSx.js";
import { E as listCommunities, T as listAccessibleChannels, _ as getCommunityBySlug, i as slugify, l as createCommunityRecord } from "./krypt-ELaGncLW.js";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-C8brSl1W.js";
import { n as useVault } from "./VaultContext-mbaTeg3u.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { ArrowUpRight, Hash, Loader2, Plus, Users } from "lucide-react";
// src/components/krypt/CreateCommunityDialog.jsx
function CreateCommunityDialog({ open, onOpenChange, onCreated }) {
	const { t } = useLang();
	const { user } = useAuth();
	const { profile } = useVault();
	const [form, setForm] = useState({
		name: "",
		description: ""
	});
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function submit(event) {
		event.preventDefault();
		setError("");
		const name = form.name.trim();
		if (name.length < 2) return setError(t("createCommunity.errName"));
		setBusy(true);
		try {
			let slug = slugify(name) || `topluluk-${Date.now().toString(36)}`;
			if (await getCommunityBySlug(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
			const community = await createCommunityRecord({
				name,
				slug,
				description: form.description.trim(),
				owner_id: user.id,
				owner_handle: profile?.handle || ""
			});
			toast.success(t("createCommunity.success", { name }));
			setForm({
				name: "",
				description: ""
			});
			onOpenChange(false);
			onCreated?.(community);
		} catch (err) {
			setError(err?.message || t("createCommunity.err"));
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ jsx(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ jsxs(DialogContent, {
			className: "border-white/[0.08] bg-[hsl(var(--card))] sm:max-w-md",
			children: [/* @__PURE__ */ jsxs(DialogHeader, { children: [/* @__PURE__ */ jsx(DialogTitle, {
				className: "font-heading text-lg tracking-[-0.02em] text-white",
				children: t("createCommunity.title")
			}), /* @__PURE__ */ jsx(DialogDescription, {
				className: "text-[12.5px] text-muted-foreground",
				children: t("createCommunity.desc")
			})] }), /* @__PURE__ */ jsxs("form", {
				onSubmit: submit,
				className: "space-y-3",
				children: [
					/* @__PURE__ */ jsxs("label", {
						className: "block",
						children: [/* @__PURE__ */ jsx("span", {
							className: "mono-label",
							children: t("createCommunity.name")
						}), /* @__PURE__ */ jsx("input", {
							value: form.name,
							onChange: (event) => setForm((prev) => ({
								...prev,
								name: event.target.value
							})),
							placeholder: t("createCommunity.namePlaceholder"),
							className: "mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40"
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "block",
						children: [/* @__PURE__ */ jsx("span", {
							className: "mono-label",
							children: t("createCommunity.description")
						}), /* @__PURE__ */ jsx("textarea", {
							value: form.description,
							onChange: (event) => setForm((prev) => ({
								...prev,
								description: event.target.value
							})),
							rows: 2,
							placeholder: t("createCommunity.descriptionPlaceholder"),
							className: "mt-1.5 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white outline-none focus:border-neon/40"
						})]
					}),
					/* @__PURE__ */ jsxs("p", {
						className: "flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
						children: [
							/* @__PURE__ */ jsx(Users, { className: "h-3.5 w-3.5 text-neon" }),
							" ",
							t("createCommunity.hint")
						]
					}),
					error && /* @__PURE__ */ jsx("p", {
						className: "rounded-xl border border-signal-red/30 bg-signal-red/[0.07] px-3 py-2 text-[12px] text-signal-red",
						children: error
					}),
					/* @__PURE__ */ jsxs("button", {
						type: "submit",
						disabled: busy,
						className: "flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-neon font-mono text-[10.5px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 disabled:opacity-60",
						children: [
							busy && /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }),
							" ",
							t("createCommunity.submit")
						]
					})
				]
			})]
		})
	});
}
// src/routes/_authed/communities.index.jsx?tsr-split=component
function CommunitiesPage() {
	const { t } = useLang();
	const { user } = useAuth();
	const navigate = useNavigate();
	const [communities, setCommunities] = useState([]);
	const [channels, setChannels] = useState([]);
	const [loading, setLoading] = useState(true);
	const [open, setOpen] = useState(false);
	const load = useCallback(async () => {
		if (!user?.id) return;
		setLoading(true);
		try {
			const [rows, accessible] = await Promise.all([listCommunities(), listAccessibleChannels(user.id)]);
			setCommunities(rows);
			setChannels(accessible.filter((channel) => channel.kind !== "direct"));
		} finally {
			setLoading(false);
		}
	}, [user?.id]);
	useEffect(() => {
		load();
	}, [load]);
	const countFor = (communityId) => channels.filter((channel) => channel.community_id === communityId).length;
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto w-full max-w-4xl",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsxs("span", {
						className: "mono-label flex items-center gap-2",
						children: [
							/* @__PURE__ */ jsx("span", { className: "signal-dot" }),
							" ",
							t("communities.label")
						]
					}),
					/* @__PURE__ */ jsx("h1", {
						className: "mt-2 font-heading text-2xl font-semibold tracking-[-0.03em] text-white",
						children: t("communities.title")
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1.5 max-w-lg text-sm text-muted-foreground",
						children: t("communities.desc")
					})
				] }), /* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: () => setOpen(true),
					className: "flex h-10 items-center gap-2 rounded-xl bg-neon px-4 font-mono text-[10.5px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90",
					children: [
						/* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }),
						" ",
						t("communities.new")
					]
				})]
			}),
			/* @__PURE__ */ jsx("section", {
				className: "mt-7",
				children: /* @__PURE__ */ jsxs("div", {
					className: "grid gap-3 sm:grid-cols-2",
					children: [
						loading && /* @__PURE__ */ jsx("div", {
							className: "grid place-items-center py-12 sm:col-span-2",
							children: /* @__PURE__ */ jsx(Loader2, { className: "h-5 w-5 animate-spin text-neon" })
						}),
						!loading && communities.map((community) => /* @__PURE__ */ jsxs(Link, {
							to: "/communities/$slug",
							params: { slug: community.slug },
							className: "group flex flex-col rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/50 p-4 transition hover:border-neon/25 hover:bg-[hsl(var(--card))]/80",
							children: [
								/* @__PURE__ */ jsxs("div", {
									className: "flex items-center gap-2",
									children: [
										/* @__PURE__ */ jsx("span", {
											className: "grid h-8 w-8 place-items-center rounded-xl border border-neon/25 bg-neon/[0.07] text-neon",
											children: /* @__PURE__ */ jsx(Users, { className: "h-3.5 w-3.5" })
										}),
										/* @__PURE__ */ jsxs("div", {
											className: "min-w-0",
											children: [/* @__PURE__ */ jsx("p", {
												className: "truncate text-[14px] font-medium text-white",
												children: community.name
											}), /* @__PURE__ */ jsxs("p", {
												className: "font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
												children: ["c/", community.slug]
											})]
										}),
										/* @__PURE__ */ jsx(ArrowUpRight, { className: "ml-auto h-3.5 w-3.5 text-muted-foreground/60 transition group-hover:text-neon" })
									]
								}),
								community.description && /* @__PURE__ */ jsx("p", {
									className: "mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground",
									children: community.description
								}),
								/* @__PURE__ */ jsxs("div", {
									className: "mt-3 flex items-center gap-3 border-t border-white/[0.05] pt-2.5",
									children: [/* @__PURE__ */ jsxs("span", {
										className: "flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
										children: [
											/* @__PURE__ */ jsx(Hash, { className: "h-3 w-3" }),
											" ",
											countFor(community.id),
											" ",
											t("communities.channels")
										]
									}), community.owner_handle && /* @__PURE__ */ jsxs("span", {
										className: "font-mono text-[10px] text-muted-foreground/70",
										children: ["@", community.owner_handle]
									})]
								})
							]
						}, community.id)),
						!loading && !communities.length && /* @__PURE__ */ jsx("p", {
							className: "rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted-foreground sm:col-span-2",
							children: t("communities.empty")
						})
					]
				})
			}),
			/* @__PURE__ */ jsx(CreateCommunityDialog, {
				open,
				onOpenChange: setOpen,
				onCreated: (community) => {
					load();
					navigate({
						to: "/communities/$slug",
						params: { slug: community.slug }
					});
				}
			})
		]
	});
}
export { CommunitiesPage as component };
