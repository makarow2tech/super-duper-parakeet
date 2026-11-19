import { D as listCommunityChannels, _ as getCommunityBySlug } from "./krypt-ELaGncLW.js";
import { n as ChannelCard, t as CreateChannelDialog } from "./CreateChannelDialog-DSLpw0Kg.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { r as Route } from "./router-CRnjuvSx.js";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, Hash, Loader2, Plus, Users } from "lucide-react";
// src/routes/_authed/communities.$slug.jsx?tsr-split=component
function CommunityPage() {
	const { t } = useLang();
	const { slug } = Route.useParams();
	const navigate = useNavigate();
	const [community, setCommunity] = useState(null);
	const [channels, setChannels] = useState([]);
	const [loading, setLoading] = useState(true);
	const [open, setOpen] = useState(false);
	const load = useCallback(async () => {
		setLoading(true);
		try {
			const found = await getCommunityBySlug(slug);
			setCommunity(found);
			setChannels(found ? await listCommunityChannels(found.id) : []);
		} finally {
			setLoading(false);
		}
	}, [slug]);
	useEffect(() => {
		load();
	}, [load]);
	if (loading) return /* @__PURE__ */ jsx("div", {
		className: "grid min-h-[40vh] place-items-center",
		children: /* @__PURE__ */ jsx(Loader2, { className: "h-5 w-5 animate-spin text-neon" })
	});
	if (!community) return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto max-w-md rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 px-6 py-10 text-center",
		children: [
			/* @__PURE__ */ jsx(Users, { className: "mx-auto h-5 w-5 text-neon" }),
			/* @__PURE__ */ jsx("p", {
				className: "mt-3 text-sm text-white",
				children: t("community.notFound")
			}),
			/* @__PURE__ */ jsx(Link, {
				to: "/communities",
				className: "mt-4 inline-block font-mono text-[10.5px] uppercase tracking-wider text-neon",
				children: t("community.back")
			})
		]
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto w-full max-w-4xl",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-4 sm:p-5",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex flex-wrap items-center gap-3",
					children: [
						/* @__PURE__ */ jsx(Link, {
							to: "/communities",
							className: "grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] text-muted-foreground transition hover:border-neon/30 hover:text-neon",
							"aria-label": t("community.backAria"),
							children: /* @__PURE__ */ jsx(ArrowLeft, { className: "h-3.5 w-3.5" })
						}),
						/* @__PURE__ */ jsx("span", {
							className: "grid h-9 w-9 place-items-center rounded-xl border border-neon/25 bg-neon/[0.07] text-neon",
							children: /* @__PURE__ */ jsx(Users, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "min-w-0",
							children: [/* @__PURE__ */ jsx("h1", {
								className: "truncate font-heading text-lg font-semibold tracking-[-0.02em] text-white",
								children: community.name
							}), /* @__PURE__ */ jsxs("p", {
								className: "flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
								children: [
									/* @__PURE__ */ jsxs("span", { children: ["c/", community.slug] }),
									/* @__PURE__ */ jsx("span", {
										className: "text-muted-foreground/50",
										children: "·"
									}),
									/* @__PURE__ */ jsxs("span", {
										className: "flex items-center gap-1",
										children: [
											/* @__PURE__ */ jsx(Hash, { className: "h-2.5 w-2.5" }),
											" ",
											channels.length,
											" ",
											t("communities.channels")
										]
									}),
									community.owner_handle && /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("span", {
										className: "text-muted-foreground/50",
										children: "·"
									}), /* @__PURE__ */ jsxs("span", { children: ["@", community.owner_handle] })] })
								]
							})]
						}),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							onClick: () => setOpen(true),
							className: "ml-auto flex h-9 items-center gap-1.5 rounded-xl bg-neon px-3 font-mono text-[10px] uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90",
							children: [
								/* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }),
								" ",
								t("community.newChannel")
							]
						})
					]
				}), community.description && /* @__PURE__ */ jsx("p", {
					className: "mt-3 border-t border-white/[0.05] pt-3 text-[13px] text-muted-foreground",
					children: community.description
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "mt-4 grid gap-3 sm:grid-cols-2",
				children: [channels.map((channel) => /* @__PURE__ */ jsx(ChannelCard, { channel }, channel.id)), !channels.length && /* @__PURE__ */ jsx("p", {
					className: "rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted-foreground sm:col-span-2",
					children: t("community.emptyChannels")
				})]
			}),
			/* @__PURE__ */ jsx(CreateChannelDialog, {
				open,
				onOpenChange: setOpen,
				community,
				onCreated: (channel) => {
					load();
					navigate({
						to: "/channels/$slug",
						params: { slug: channel.slug }
					});
				}
			})
		]
	});
}
export { CommunityPage as component };
