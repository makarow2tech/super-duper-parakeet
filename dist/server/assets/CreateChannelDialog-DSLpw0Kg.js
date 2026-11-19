import { E as listCommunities, c as createChannelRecord, g as getChannelBySlug, i as slugify, s as addChannelMember } from "./krypt-ELaGncLW.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { l as useAuth } from "./router-CRnjuvSx.js";
import { n as useVault } from "./VaultContext-mbaTeg3u.js";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-C8brSl1W.js";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { ArrowUpRight, Hash, Loader2, LockKeyhole, Users } from "lucide-react";
// src/components/krypt/ChannelCard.jsx
function ChannelCard({ channel }) {
	const { t } = useLang();
	const isPrivate = channel.visibility === "private";
	return /* @__PURE__ */ jsxs(Link, {
		to: "/channels/$slug",
		params: { slug: channel.slug },
		className: "group flex flex-col rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/50 p-4 transition hover:border-neon/25 hover:bg-[hsl(var(--card))]/80",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-2",
				children: [
					/* @__PURE__ */ jsx("span", {
						className: isPrivate ? "grid h-8 w-8 place-items-center rounded-xl border border-neon-2/30 bg-neon-2/[0.08] text-neon-2" : "grid h-8 w-8 place-items-center rounded-xl border border-neon/25 bg-neon/[0.07] text-neon",
						children: isPrivate ? /* @__PURE__ */ jsx(LockKeyhole, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ jsx(Hash, { className: "h-3.5 w-3.5" })
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ jsx("p", {
							className: "truncate text-[14px] font-medium text-white",
							children: channel.name
						}), /* @__PURE__ */ jsx("p", {
							className: "truncate font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
							children: channel.community_name ? `${t("channel.community")} · ${channel.community_name}` : channel.kind === "general" ? t("channel.general") : isPrivate ? t("channel.privateInvite") : t("channel.public")
						})]
					}),
					/* @__PURE__ */ jsx(ArrowUpRight, { className: "ml-auto h-3.5 w-3.5 text-muted-foreground/60 transition group-hover:text-neon" })
				]
			}),
			channel.description && /* @__PURE__ */ jsx("p", {
				className: "mt-3 line-clamp-2 text-[12.5px] leading-relaxed text-muted-foreground",
				children: channel.description
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "mt-3 flex items-center gap-3 border-t border-white/[0.05] pt-2.5",
				children: [/* @__PURE__ */ jsxs("span", {
					className: "flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
					children: [
						/* @__PURE__ */ jsx(Users, { className: "h-3 w-3" }),
						" ",
						(channel.members || []).length,
						" ",
						t("channel.members")
					]
				}), channel.owner_handle && /* @__PURE__ */ jsxs("span", {
					className: "font-mono text-[10px] text-muted-foreground/70",
					children: ["@", channel.owner_handle]
				})]
			})
		]
	});
}
// src/components/krypt/CreateChannelDialog.jsx
function CreateChannelDialog({ open, onOpenChange, onCreated, community = null }) {
	const { t } = useLang();
	const { user } = useAuth();
	const { profile, newKey, wrapFor } = useVault();
	const [form, setForm] = useState({
		name: "",
		description: "",
		visibility: "public",
		communityId: ""
	});
	const [communities, setCommunities] = useState([]);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	useEffect(() => {
		if (!open || community) return;
		let alive = true;
		listCommunities().then((rows) => {
			if (alive) setCommunities(rows);
		}).catch(() => {});
		return () => {
			alive = false;
		};
	}, [open, community]);
	async function submit(event) {
		event.preventDefault();
		setError("");
		const name = form.name.trim();
		if (name.length < 2) return setError(t("create.errName"));
		setBusy(true);
		try {
			let slug = slugify(name) || `kanal-${Date.now().toString(36)}`;
			if (await getChannelBySlug(slug)) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
			const parent = community || communities.find((row) => row.id === form.communityId) || null;
			const channel = await createChannelRecord({
				name,
				slug,
				description: form.description.trim(),
				visibility: form.visibility,
				kind: "custom",
				owner_id: user.id,
				owner_handle: profile?.handle || "",
				members: [user.id],
				...parent ? {
					community_id: parent.id,
					community_name: parent.name,
					community_slug: parent.slug
				} : {}
			});
			if (form.visibility === "private") {
				const key = newKey();
				const wrapped = await wrapFor(profile.public_key, key);
				await addChannelMember({
					channel_id: channel.id,
					user_id: user.id,
					handle: profile?.handle || "",
					role: "owner",
					wrapped_key: wrapped
				});
			}
			toast.success(t("create.success", { name }));
			setForm({
				name: "",
				description: "",
				visibility: "public",
				communityId: ""
			});
			onOpenChange(false);
			onCreated?.(channel);
		} catch (err) {
			setError(err?.message || t("create.err"));
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
				children: t("create.title")
			}), /* @__PURE__ */ jsx(DialogDescription, {
				className: "text-[12.5px] text-muted-foreground",
				children: t("create.desc")
			})] }), /* @__PURE__ */ jsxs("form", {
				onSubmit: submit,
				className: "space-y-3",
				children: [
					/* @__PURE__ */ jsxs("label", {
						className: "block",
						children: [/* @__PURE__ */ jsx("span", {
							className: "mono-label",
							children: t("create.name")
						}), /* @__PURE__ */ jsx("input", {
							value: form.name,
							onChange: (event) => setForm((prev) => ({
								...prev,
								name: event.target.value
							})),
							placeholder: t("create.namePlaceholder"),
							className: "mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 text-sm text-white outline-none focus:border-neon/40"
						})]
					}),
					/* @__PURE__ */ jsxs("label", {
						className: "block",
						children: [/* @__PURE__ */ jsx("span", {
							className: "mono-label",
							children: t("create.description")
						}), /* @__PURE__ */ jsx("textarea", {
							value: form.description,
							onChange: (event) => setForm((prev) => ({
								...prev,
								description: event.target.value
							})),
							rows: 2,
							placeholder: t("create.descriptionPlaceholder"),
							className: "mt-1.5 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-sm text-white outline-none focus:border-neon/40"
						})]
					}),
					community ? /* @__PURE__ */ jsxs("p", {
						className: "flex items-center gap-2 rounded-xl border border-neon/25 bg-neon/[0.06] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-neon",
						children: [
							/* @__PURE__ */ jsx(Users, { className: "h-3.5 w-3.5" }),
							" ",
							t("create.communityFixed", { name: community.name })
						]
					}) : /* @__PURE__ */ jsxs("label", {
						className: "block",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "mono-label",
								children: t("create.community")
							}),
							/* @__PURE__ */ jsxs("select", {
								value: form.communityId,
								onChange: (event) => setForm((prev) => ({
									...prev,
									communityId: event.target.value
								})),
								className: "mt-1.5 h-10 w-full rounded-xl border border-white/[0.08] bg-[hsl(var(--card))] px-3 text-sm text-white outline-none focus:border-neon/40",
								children: [/* @__PURE__ */ jsx("option", {
									value: "",
									children: t("create.communityNone")
								}), communities.map((row) => /* @__PURE__ */ jsx("option", {
									value: row.id,
									children: row.name
								}, row.id))]
							}),
							/* @__PURE__ */ jsx("span", {
								className: "mt-1 block font-mono text-[10px] text-muted-foreground/70",
								children: t("create.communityHint")
							})
						]
					}),
					/* @__PURE__ */ jsx("div", {
						className: "grid grid-cols-2 gap-2",
						children: [{
							value: "public",
							label: t("create.public"),
							hint: t("create.publicHint"),
							icon: Hash
						}, {
							value: "private",
							label: t("create.private"),
							hint: t("create.privateHint"),
							icon: LockKeyhole
						}].map(({ value, label, hint, icon: Icon }) => /* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => setForm((prev) => ({
								...prev,
								visibility: value
							})),
							className: form.visibility === value ? "flex items-start gap-2 rounded-xl border border-neon/40 bg-neon/[0.08] px-3 py-2.5 text-left" : "flex items-start gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-left transition hover:border-white/20",
							children: [/* @__PURE__ */ jsx(Icon, { className: form.visibility === value ? "mt-0.5 h-3.5 w-3.5 text-neon" : "mt-0.5 h-3.5 w-3.5 text-muted-foreground" }), /* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx("span", {
								className: "block text-[12.5px] font-medium text-white",
								children: label
							}), /* @__PURE__ */ jsx("span", {
								className: "block font-mono text-[10px] text-muted-foreground",
								children: hint
							})] })]
						}, value))
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
							t("create.submit")
						]
					})
				]
			})]
		})
	});
}
export { ChannelCard as n, CreateChannelDialog as t };
