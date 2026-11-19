import { i as Route, l as useAuth } from "./router-CRnjuvSx.js";
import { P as updateChannel, g as getChannelBySlug, p as deleteChannelMember, r as normalizeHandle, s as addChannelMember, v as getMyMembership, x as getProfileByHandle } from "./krypt-ELaGncLW.js";
import { t as ChannelThread } from "./ChannelThread-yDDeDZlL.js";
import { a as DialogHeader, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-C8brSl1W.js";
import { n as useVault } from "./VaultContext-mbaTeg3u.js";
import { t as notifyMembers } from "./notify-BYMJEEJv.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { ArrowLeft, Hash, Loader2, LockKeyhole, LogOut, UserPlus, Users } from "lucide-react";
// src/components/krypt/InviteDialog.jsx
function InviteDialog({ open, onOpenChange, channel, onInvited }) {
	const { t } = useLang();
	const { user } = useAuth();
	const { profile, channelKey, wrapFor } = useVault();
	const [handle, setHandle] = useState("");
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState("");
	async function submit(event) {
		event.preventDefault();
		setError("");
		const wanted = normalizeHandle(handle);
		if (!wanted) return setError(t("invite.errHandle"));
		setBusy(true);
		try {
			const target = await getProfileByHandle(wanted);
			if (!target) {
				setError(t("invite.errNotFound"));
				return;
			}
			if (target.user_id === user.id) {
				setError(t("invite.errSelf"));
				return;
			}
			if ((channel.members || []).includes(target.user_id)) {
				setError(t("invite.errMember"));
				return;
			}
			const key = await channelKey(channel);
			if (!key) {
				setError(t("invite.errNoKey"));
				return;
			}
			const wrapped = await wrapFor(target.public_key, key);
			await addChannelMember({
				channel_id: channel.id,
				user_id: target.user_id,
				handle: target.handle,
				role: "member",
				wrapped_key: wrapped
			});
			await updateChannel(channel.id, { members: [...channel.members || [], target.user_id] });
			notifyMembers({ data: {
				channelId: channel.id,
				type: "invite",
				title: t("invite.titleNotify", {
					handle: profile?.handle || t("common.user"),
					channel: channel.name
				}),
				onlyUserId: target.user_id
			} }).catch(() => {});
			toast.success(t("invite.success", { handle: target.handle }));
			setHandle("");
			onOpenChange(false);
			onInvited?.();
		} catch (err) {
			setError(err?.message || t("invite.err"));
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
				children: t("invite.title")
			}), /* @__PURE__ */ jsx(DialogDescription, {
				className: "text-[12.5px] text-muted-foreground",
				children: t("invite.desc")
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
							placeholder: t("invite.placeholder"),
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
							busy ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsx(UserPlus, { className: "h-3.5 w-3.5" }),
							" ",
							t("invite.submit")
						]
					})
				]
			})]
		})
	});
}
// src/routes/_authed/channels.$slug.jsx?tsr-split=component
function ChannelPage() {
	const { t } = useLang();
	const { slug } = Route.useParams();
	const { user } = useAuth();
	const navigate = useNavigate();
	const [channel, setChannel] = useState(null);
	const [membership, setMembership] = useState(null);
	const [loading, setLoading] = useState(true);
	const [inviteOpen, setInviteOpen] = useState(false);
	const load = useCallback(async () => {
		setLoading(true);
		try {
			const found = await getChannelBySlug(slug);
			setChannel(found);
			if (found) setMembership(await getMyMembership(found.id, user.id));
		} finally {
			setLoading(false);
		}
	}, [slug, user?.id]);
	useEffect(() => {
		load();
	}, [load]);
	async function leave() {
		if (!channel || !membership) return;
		await deleteChannelMember(membership.id);
		await updateChannel(channel.id, { members: (channel.members || []).filter((id) => id !== user.id) });
		toast.success(t("channel.left"));
		navigate({ to: "/channels" });
	}
	if (loading) return /* @__PURE__ */ jsx("div", {
		className: "grid min-h-[40vh] place-items-center",
		children: /* @__PURE__ */ jsx(Loader2, { className: "h-5 w-5 animate-spin text-neon" })
	});
	if (!channel) return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto max-w-md rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 px-6 py-10 text-center",
		children: [
			/* @__PURE__ */ jsx(LockKeyhole, { className: "mx-auto h-5 w-5 text-neon-2" }),
			/* @__PURE__ */ jsx("p", {
				className: "mt-3 text-sm text-white",
				children: t("channel.notFound")
			}),
			/* @__PURE__ */ jsx(Link, {
				to: "/channels",
				className: "mt-4 inline-block font-mono text-[10.5px] uppercase tracking-wider text-neon",
				children: t("channel.back")
			})
		]
	});
	const isPrivate = channel.visibility === "private";
	const isOwner = channel.owner_id === user?.id;
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto w-full max-w-4xl",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-4 sm:p-5",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "flex flex-wrap items-center gap-3",
						children: [
							/* @__PURE__ */ jsx(Link, {
								to: "/channels",
								className: "grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] text-muted-foreground transition hover:border-neon/30 hover:text-neon",
								"aria-label": t("channel.backAria"),
								children: /* @__PURE__ */ jsx(ArrowLeft, { className: "h-3.5 w-3.5" })
							}),
							/* @__PURE__ */ jsx("span", {
								className: isPrivate ? "grid h-9 w-9 place-items-center rounded-xl border border-neon-2/30 bg-neon-2/[0.08] text-neon-2" : "grid h-9 w-9 place-items-center rounded-xl border border-neon/25 bg-neon/[0.07] text-neon",
								children: isPrivate ? /* @__PURE__ */ jsx(LockKeyhole, { className: "h-4 w-4" }) : /* @__PURE__ */ jsx(Hash, { className: "h-4 w-4" })
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ jsx("h1", {
									className: "truncate font-heading text-lg font-semibold tracking-[-0.02em] text-white",
									children: channel.name
								}), /* @__PURE__ */ jsxs("p", {
									className: "flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
									children: [
										/* @__PURE__ */ jsxs("span", {
											className: "flex items-center gap-1",
											children: [
												/* @__PURE__ */ jsx(Users, { className: "h-2.5 w-2.5" }),
												" ",
												(channel.members || []).length,
												" ",
												t("channel.members")
											]
										}),
										/* @__PURE__ */ jsx("span", {
											className: "text-muted-foreground/50",
											children: "·"
										}),
										/* @__PURE__ */ jsx("span", { children: isPrivate ? t("channel.privateE2e") : t("channel.public") })
									]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "ml-auto flex items-center gap-2",
								children: [isPrivate && /* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: () => setInviteOpen(true),
									className: "flex h-9 items-center gap-1.5 rounded-xl border border-neon/30 bg-neon/[0.07] px-3 font-mono text-[10px] uppercase tracking-wider text-neon transition hover:bg-neon/[0.12]",
									children: [
										/* @__PURE__ */ jsx(UserPlus, { className: "h-3.5 w-3.5" }),
										" ",
										t("channel.invite")
									]
								}), isPrivate && membership && !isOwner && /* @__PURE__ */ jsxs("button", {
									type: "button",
									onClick: leave,
									className: "flex h-9 items-center gap-1.5 rounded-xl border border-white/[0.08] px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-signal-red/40 hover:text-signal-red",
									children: [
										/* @__PURE__ */ jsx(LogOut, { className: "h-3.5 w-3.5" }),
										" ",
										t("channel.leave")
									]
								})]
							})
						]
					}),
					channel.community_slug && /* @__PURE__ */ jsxs(Link, {
						to: "/communities/$slug",
						params: { slug: channel.community_slug },
						className: "mt-3 inline-flex items-center gap-1.5 rounded-lg border border-neon/25 bg-neon/[0.06] px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-neon transition hover:bg-neon/[0.12]",
						children: [
							/* @__PURE__ */ jsx(Users, { className: "h-3 w-3" }),
							" ",
							t("channel.community"),
							": ",
							channel.community_name || channel.community_slug
						]
					}),
					channel.description && /* @__PURE__ */ jsx("p", {
						className: "mt-3 border-t border-white/[0.05] pt-3 text-[13px] text-muted-foreground",
						children: channel.description
					})
				]
			}),
			/* @__PURE__ */ jsx("div", {
				className: "mt-3",
				children: /* @__PURE__ */ jsx(ChannelThread, {
					channel,
					membership
				})
			}),
			/* @__PURE__ */ jsx(InviteDialog, {
				open: inviteOpen,
				onOpenChange: setInviteOpen,
				channel,
				onInvited: load
			})
		]
	});
}
export { ChannelPage as component };
