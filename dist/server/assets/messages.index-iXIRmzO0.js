import { l as useAuth } from "./router-CRnjuvSx.js";
import { t as useChannels } from "./useChannels-BQIHdmvq.js";
import { n as useVault } from "./VaultContext-mbaTeg3u.js";
import { t as HandleAvatar } from "./HandleAvatar-CMauiase.js";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-C8brSl1W.js";
import { c as createChannelRecord, g as getChannelBySlug, r as normalizeHandle, s as addChannelMember, x as getProfileByHandle } from "./krypt-ELaGncLW.js";
import { t as notifyMembers } from "./notify-BYMJEEJv.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { Loader2, LockKeyhole, MessageSquarePlus } from "lucide-react";
// src/components/krypt/NewChatDialog.jsx
function NewChatDialog({ open, onOpenChange }) {
	const { t } = useLang();
	const { user } = useAuth();
	const { profile, newKey, wrapFor } = useVault();
	const navigate = useNavigate();
	const [handle, setHandle] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function submit(event) {
		event.preventDefault();
		setError("");
		const wanted = normalizeHandle(handle);
		if (!wanted) return setError(t("newChat.errHandle"));
		setBusy(true);
		try {
			const target = await getProfileByHandle(wanted);
			if (!target) {
				setError(t("newChat.errNotFound"));
				return;
			}
			if (target.user_id === user.id) {
				setError(t("newChat.errSelf"));
				return;
			}
			const pair = [profile.handle, target.handle].sort();
			const slug = `dm-${pair.join("-")}`;
			if (await getChannelBySlug(slug)) {
				onOpenChange(false);
				navigate({
					to: "/messages/$slug",
					params: { slug }
				});
				return;
			}
			const key = newKey();
			const mine = await wrapFor(profile.public_key, key);
			const theirs = await wrapFor(target.public_key, key);
			const channel = await createChannelRecord({
				name: pair.join(" · "),
				slug,
				visibility: "private",
				kind: "direct",
				owner_id: user.id,
				owner_handle: profile.handle,
				members: [user.id, target.user_id]
			});
			await addChannelMember({
				channel_id: channel.id,
				user_id: user.id,
				handle: profile.handle,
				role: "owner",
				wrapped_key: mine
			});
			await addChannelMember({
				channel_id: channel.id,
				user_id: target.user_id,
				handle: target.handle,
				role: "member",
				wrapped_key: theirs
			});
			notifyMembers({ data: {
				channelId: channel.id,
				type: "dm",
				title: t("newChat.notify", { handle: profile.handle }),
				onlyUserId: target.user_id
			} }).catch(() => {});
			setHandle("");
			onOpenChange(false);
			navigate({
				to: "/messages/$slug",
				params: { slug }
			});
		} catch (err) {
			setError(err?.message || t("newChat.err"));
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ jsx(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ jsxs(DialogContent, {
			className: "border-white/[0.08] bg-[hsl(var(--card))] sm:max-w-sm",
			children: [/* @__PURE__ */ jsxs(DialogHeader, { children: [/* @__PURE__ */ jsx(DialogTitle, {
				className: "font-heading text-lg tracking-[-0.02em] text-white",
				children: t("newChat.title")
			}), /* @__PURE__ */ jsx(DialogDescription, {
				className: "text-[12.5px] text-muted-foreground",
				children: t("newChat.desc")
			})] }), /* @__PURE__ */ jsxs("form", {
				onSubmit: submit,
				className: "space-y-3",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex items-center rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 focus-within:border-neon/40",
						children: [/* @__PURE__ */ jsx("span", {
							className: "font-mono text-sm text-neon",
							children: "@"
						}), /* @__PURE__ */ jsx("input", {
							value: handle,
							onChange: (event) => setHandle(event.target.value),
							placeholder: t("newChat.placeholder"),
							className: "h-10 w-full bg-transparent px-2 font-mono text-sm text-white outline-none placeholder:text-muted-foreground/60"
						})]
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
							busy ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsx(MessageSquarePlus, { className: "h-3.5 w-3.5" }),
							" ",
							t("newChat.submit")
						]
					})
				]
			})]
		})
	});
}
// src/routes/_authed/messages.index.jsx?tsr-split=component
function otherHandle(channel, myHandle, fallback = "sohbet") {
	const parts = String(channel.name || "").split("·").map((part) => part.trim()).filter(Boolean);
	return parts.find((part) => part !== myHandle) || parts[0] || fallback;
}
function MessagesPage() {
	const { t } = useLang();
	const { user } = useAuth();
	const { profile } = useVault();
	const { channels, loading } = useChannels();
	const [open, setOpen] = useState(false);
	const dms = channels.filter((channel) => channel.kind === "direct" && (channel.members || []).includes(user?.id));
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto w-full max-w-3xl",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsxs("span", {
						className: "mono-label flex items-center gap-2",
						children: [
							/* @__PURE__ */ jsx("span", { className: "signal-dot" }),
							" ",
							t("messages.label")
						]
					}),
					/* @__PURE__ */ jsx("h1", {
						className: "mt-2 font-heading text-2xl font-semibold tracking-[-0.03em] text-white",
						children: t("messages.title")
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1.5 max-w-md text-sm text-muted-foreground",
						children: t("messages.desc")
					})
				] }), /* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: () => setOpen(true),
					className: "flex h-10 items-center gap-2 rounded-xl bg-neon px-4 font-mono text-[10.5px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90",
					children: [
						/* @__PURE__ */ jsx(MessageSquarePlus, { className: "h-3.5 w-3.5" }),
						" ",
						t("messages.new")
					]
				})]
			}),
			/* @__PURE__ */ jsxs("ul", {
				className: "mt-6 space-y-2",
				children: [dms.map((channel) => /* @__PURE__ */ jsx("li", { children: /* @__PURE__ */ jsxs(Link, {
					to: "/messages/$slug",
					params: { slug: channel.slug },
					className: "flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/50 px-4 py-3 transition hover:border-neon/25 hover:bg-[hsl(var(--card))]/80",
					children: [
						/* @__PURE__ */ jsx(HandleAvatar, {
							name: otherHandle(channel, profile?.handle, t("messages.chat")),
							size: 36
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ jsxs("p", {
								className: "truncate font-mono text-[13px] text-white",
								children: ["@", otherHandle(channel, profile?.handle, t("messages.chat"))]
							}), /* @__PURE__ */ jsx("p", {
								className: "font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
								children: t("messages.privateChat")
							})]
						}),
						/* @__PURE__ */ jsx(LockKeyhole, { className: "ml-auto h-3.5 w-3.5 text-neon-2/70" })
					]
				}) }, channel.id)), !loading && !dms.length && /* @__PURE__ */ jsxs("li", {
					className: "rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center",
					children: [/* @__PURE__ */ jsx("p", {
						className: "text-sm text-white/80",
						children: t("messages.emptyTitle")
					}), /* @__PURE__ */ jsx("p", {
						className: "mt-1 text-[12.5px] text-muted-foreground",
						children: t("messages.emptyHint")
					})]
				})]
			}),
			/* @__PURE__ */ jsx(NewChatDialog, {
				open,
				onOpenChange: setOpen
			})
		]
	});
}
export { MessagesPage as component };
