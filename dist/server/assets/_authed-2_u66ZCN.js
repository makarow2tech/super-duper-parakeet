import { a as Route, l as useAuth } from "./router-CRnjuvSx.js";
import { n as useVault, r as decryptMessage } from "./VaultContext-mbaTeg3u.js";
import { t as useChannels } from "./useChannels-BQIHdmvq.js";
import { a as timeAgo, w as latestMessages } from "./krypt-ELaGncLW.js";
import { t as HandleAvatar } from "./HandleAvatar-CMauiase.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { ArrowUpRight, Hash, LockKeyhole, MessageSquare, Plus, ShieldCheck, Sparkles } from "lucide-react";
// src/routes/_authed/index.jsx?tsr-split=component
function FeedPage() {
	const { t, lang } = useLang();
	const { user } = useAuth();
	const { channelKey } = useVault();
	const { channels, memberships, loading: channelsLoading } = useChannels();
	const search = Route.useSearch();
	const [feed, setFeed] = useState([]);
	const [loading, setLoading] = useState(true);
	useEffect(() => {
		if (channelsLoading) return;
		let alive = true;
		(async () => {
			const raw = await latestMessages(50);
			const byId = new Map(channels.map((channel) => [channel.id, channel]));
			const memberByChannel = new Map(memberships.map((row) => [row.channel_id, row]));
			const keys = /* @__PURE__ */ new Map();
			for (const channel of byId.values()) {
				const key = await channelKey(channel, memberByChannel.get(channel.id));
				if (key) keys.set(channel.id, key);
			}
			const decoded = [];
			for (const row of raw) {
				const channel = byId.get(row.channel_id);
				const key = channel && keys.get(row.channel_id);
				if (!channel || !key) continue;
				const text = await decryptMessage(row.cipher, key);
				if (!text) continue;
				decoded.push({
					...row,
					text,
					channel
				});
			}
			if (alive) {
				setFeed(decoded);
				setLoading(false);
			}
		})();
		return () => {
			alive = false;
		};
	}, [
		channelsLoading,
		channels,
		memberships,
		channelKey
	]);
	const posts = useMemo(() => {
		const needle = String(search.q || "").trim().toLowerCase();
		if (!needle) return feed;
		return feed.filter((item) => item.text.toLowerCase().includes(needle) || (item.author_handle || "").toLowerCase().includes(needle) || (item.channel?.name || "").toLowerCase().includes(needle));
	}, [feed, search.q]);
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto w-full max-w-3xl",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "relative overflow-hidden rounded-3xl border border-white/[0.07] bg-[hsl(var(--card))]/60 px-6 py-7 sm:px-8",
				children: [/* @__PURE__ */ jsx("div", { className: "grid-backdrop pointer-events-none absolute inset-0 opacity-40" }), /* @__PURE__ */ jsxs("div", {
					className: "relative",
					children: [
						/* @__PURE__ */ jsxs("span", {
							className: "mono-label flex items-center gap-2",
							children: [
								/* @__PURE__ */ jsx("span", { className: "signal-dot" }),
								" ",
								t("feed.label")
							]
						}),
						/* @__PURE__ */ jsx("h1", {
							className: "mt-3 font-heading text-2xl font-semibold tracking-[-0.03em] text-white sm:text-[28px]",
							children: t("feed.title")
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-2 max-w-md text-sm text-muted-foreground",
							children: t("feed.desc")
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "mt-5 flex flex-wrap gap-2",
							children: [
								/* @__PURE__ */ jsxs("span", {
									className: "flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2",
									children: [
										/* @__PURE__ */ jsx(Hash, {
											className: "h-3.5 w-3.5 text-neon",
											strokeWidth: 1.8
										}),
										/* @__PURE__ */ jsx("strong", {
											className: "font-mono text-sm text-white",
											children: channels.length
										}),
										/* @__PURE__ */ jsx("span", {
											className: "mono-label",
											children: t("feed.channels")
										})
									]
								}),
								/* @__PURE__ */ jsxs("span", {
									className: "flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2",
									children: [
										/* @__PURE__ */ jsx(MessageSquare, {
											className: "h-3.5 w-3.5 text-signal-blue",
											strokeWidth: 1.8
										}),
										/* @__PURE__ */ jsx("strong", {
											className: "font-mono text-sm text-white",
											children: feed.length
										}),
										/* @__PURE__ */ jsx("span", {
											className: "mono-label",
											children: t("feed.messages")
										})
									]
								}),
								/* @__PURE__ */ jsxs("span", {
									className: "flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2",
									children: [/* @__PURE__ */ jsx(ShieldCheck, {
										className: "h-3.5 w-3.5 text-neon-2",
										strokeWidth: 1.8
									}), /* @__PURE__ */ jsx("span", {
										className: "mono-label",
										children: t("feed.e2e")
									})]
								})
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "mt-4 flex items-center justify-between px-1",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-center gap-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-1",
					children: [/* @__PURE__ */ jsx("span", {
						className: "rounded-lg bg-neon px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--primary-foreground))]",
						children: t("feed.tab")
					}), /* @__PURE__ */ jsx(Link, {
						to: "/channels",
						className: "px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:text-white",
						children: t("feed.tabChannels")
					})]
				}), /* @__PURE__ */ jsxs(Link, {
					to: "/channels",
					className: "flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:text-neon",
					children: [
						/* @__PURE__ */ jsx(Plus, { className: "h-3 w-3" }),
						" ",
						t("feed.createChannel")
					]
				})]
			}),
			loading ? /* @__PURE__ */ jsx("p", {
				className: "mt-6 text-center font-mono text-[11px] uppercase tracking-wider text-muted-foreground",
				children: t("feed.decoding")
			}) : /* @__PURE__ */ jsx("ul", {
				className: "mt-3 space-y-3",
				children: posts.map((item) => /* @__PURE__ */ jsxs("li", {
					className: "group rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/50 p-4 transition hover:border-neon/25 hover:bg-[hsl(var(--card))]/80 sm:p-5",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-2 text-[11px]",
							children: [
								/* @__PURE__ */ jsx(HandleAvatar, {
									name: item.author_handle || "?",
									size: 28
								}),
								/* @__PURE__ */ jsxs("span", {
									className: "font-mono text-white",
									children: ["@", item.author_handle || t("feed.user")]
								}),
								/* @__PURE__ */ jsx("span", {
									className: "text-muted-foreground",
									children: "·"
								}),
								/* @__PURE__ */ jsx("span", {
									className: "font-mono text-muted-foreground",
									children: timeAgo(item.created_date, lang)
								}),
								/* @__PURE__ */ jsxs(Link, {
									to: item.channel.kind === "direct" ? "/messages/$slug" : "/channels/$slug",
									params: { slug: item.channel.slug },
									className: "ml-auto flex items-center gap-1.5 rounded-lg border border-white/[0.08] px-2 py-1 font-mono text-[10px] text-muted-foreground transition hover:border-neon/30 hover:text-neon",
									children: [item.channel.visibility === "private" ? /* @__PURE__ */ jsx(LockKeyhole, {
										className: "h-3 w-3 text-neon-2",
										strokeWidth: 1.9
									}) : /* @__PURE__ */ jsx(Hash, {
										className: "h-3 w-3",
										strokeWidth: 1.9
									}), item.channel.kind === "direct" ? t("feed.directChat") : item.channel.name]
								})
							]
						}),
						/* @__PURE__ */ jsx("p", {
							className: "mt-3 whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-foreground/90",
							children: item.text
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "mt-4 flex items-center gap-4 border-t border-white/[0.05] pt-3",
							children: [/* @__PURE__ */ jsxs("span", {
								className: "flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground/70",
								children: [/* @__PURE__ */ jsx(LockKeyhole, { className: "h-3 w-3" }), " aes-256"]
							}), /* @__PURE__ */ jsxs(Link, {
								to: item.channel.kind === "direct" ? "/messages/$slug" : "/channels/$slug",
								params: { slug: item.channel.slug },
								className: "ml-auto flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition group-hover:text-neon",
								children: [
									item.channel.kind === "direct" ? t("feed.goChat") : t("feed.goChannel"),
									" ",
									/* @__PURE__ */ jsx(ArrowUpRight, { className: "h-3 w-3" })
								]
							})]
						})
					]
				}, item.id))
			}),
			!loading && !posts.length && /* @__PURE__ */ jsxs("div", {
				className: "mt-3 rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center",
				children: [
					/* @__PURE__ */ jsx("p", {
						className: "font-heading text-base text-white/80",
						children: search.q ? t("feed.emptySearch") : t("feed.empty")
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1 text-[13px] text-muted-foreground",
						children: user?.email ? t("feed.emptyHint") : ""
					}),
					/* @__PURE__ */ jsxs(Link, {
						to: "/channels",
						className: "mt-4 inline-flex items-center gap-1.5 rounded-xl bg-neon px-3.5 py-2 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--primary-foreground))]",
						children: [
							/* @__PURE__ */ jsx(Sparkles, { className: "h-3 w-3" }),
							" ",
							t("feed.goChannels")
						]
					})
				]
			})
		]
	});
}
export { FeedPage as component };
