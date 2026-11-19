import { l as useAuth } from "./router-CRnjuvSx.js";
import { t as useChannels } from "./useChannels-BQIHdmvq.js";
import { n as ChannelCard, t as CreateChannelDialog } from "./CreateChannelDialog-DSLpw0Kg.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { Hash, LockKeyhole, Plus } from "lucide-react";
// src/routes/_authed/channels.index.jsx?tsr-split=component
function ChannelsPage() {
	const { t } = useLang();
	const { user } = useAuth();
	const { channels, loading, refresh } = useChannels();
	const navigate = useNavigate();
	const [open, setOpen] = useState(false);
	const publics = channels.filter((channel) => channel.visibility === "public" && channel.kind !== "direct");
	const privates = channels.filter((channel) => channel.visibility === "private" && channel.kind !== "direct" && (channel.members || []).includes(user?.id));
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
							t("channels.label")
						]
					}),
					/* @__PURE__ */ jsx("h1", {
						className: "mt-2 font-heading text-2xl font-semibold tracking-[-0.03em] text-white",
						children: t("channels.title")
					}),
					/* @__PURE__ */ jsx("p", {
						className: "mt-1.5 max-w-lg text-sm text-muted-foreground",
						children: t("channels.desc")
					})
				] }), /* @__PURE__ */ jsxs("button", {
					type: "button",
					onClick: () => setOpen(true),
					className: "flex h-10 items-center gap-2 rounded-xl bg-neon px-4 font-mono text-[10.5px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90",
					children: [
						/* @__PURE__ */ jsx(Plus, { className: "h-3.5 w-3.5" }),
						" ",
						t("channels.new")
					]
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "mt-7",
				children: [/* @__PURE__ */ jsxs("h2", {
					className: "flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neon",
					children: [
						/* @__PURE__ */ jsx(Hash, { className: "h-3.5 w-3.5" }),
						" ",
						t("channels.public")
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "mt-3 grid gap-3 sm:grid-cols-2",
					children: [publics.map((channel) => /* @__PURE__ */ jsx(ChannelCard, { channel }, channel.id)), !loading && !publics.length && /* @__PURE__ */ jsx("p", {
						className: "rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted-foreground sm:col-span-2",
						children: t("channels.emptyPublic")
					})]
				})]
			}),
			/* @__PURE__ */ jsxs("section", {
				className: "mt-7",
				children: [/* @__PURE__ */ jsxs("h2", {
					className: "flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-neon-2",
					children: [
						/* @__PURE__ */ jsx(LockKeyhole, { className: "h-3.5 w-3.5" }),
						" ",
						t("channels.private")
					]
				}), /* @__PURE__ */ jsxs("div", {
					className: "mt-3 grid gap-3 sm:grid-cols-2",
					children: [privates.map((channel) => /* @__PURE__ */ jsx(ChannelCard, { channel }, channel.id)), !loading && !privates.length && /* @__PURE__ */ jsx("p", {
						className: "rounded-2xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted-foreground sm:col-span-2",
						children: t("channels.emptyPrivate")
					})]
				})]
			}),
			/* @__PURE__ */ jsx(CreateChannelDialog, {
				open,
				onOpenChange: setOpen,
				onCreated: (channel) => {
					refresh();
					navigate({
						to: "/channels/$slug",
						params: { slug: channel.slug }
					});
				}
			})
		]
	});
}
export { ChannelsPage as component };
