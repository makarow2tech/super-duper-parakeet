import { l as useAuth, n as Route } from "./router-CRnjuvSx.js";
import { g as getChannelBySlug, v as getMyMembership } from "./krypt-ELaGncLW.js";
import { n as useVault } from "./VaultContext-mbaTeg3u.js";
import { t as ChannelThread } from "./ChannelThread-yDDeDZlL.js";
import { t as HandleAvatar } from "./HandleAvatar-CMauiase.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, Loader2, LockKeyhole } from "lucide-react";
// src/routes/_authed/messages.$slug.jsx?tsr-split=component
function ChatPage() {
	const { t } = useLang();
	const { slug } = Route.useParams();
	const { user } = useAuth();
	const { profile } = useVault();
	const [channel, setChannel] = useState(null);
	const [membership, setMembership] = useState(null);
	const [loading, setLoading] = useState(true);
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
				children: t("messages.notFound")
			}),
			/* @__PURE__ */ jsx(Link, {
				to: "/messages",
				className: "mt-4 inline-block font-mono text-[10.5px] uppercase tracking-wider text-neon",
				children: t("messages.back")
			})
		]
	});
	const other = String(channel.name || "").split("·").map((part) => part.trim()).find((part) => part && part !== profile?.handle) || t("messages.chat");
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto w-full max-w-3xl",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/60 p-4",
			children: [
				/* @__PURE__ */ jsx(Link, {
					to: "/messages",
					className: "grid h-8 w-8 place-items-center rounded-lg border border-white/[0.08] text-muted-foreground transition hover:border-neon/30 hover:text-neon",
					"aria-label": t("messages.backAria"),
					children: /* @__PURE__ */ jsx(ArrowLeft, { className: "h-3.5 w-3.5" })
				}),
				/* @__PURE__ */ jsx(HandleAvatar, {
					name: other,
					size: 34
				}),
				/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h1", {
					className: "font-mono text-[14px] text-white",
					children: ["@", other]
				}), /* @__PURE__ */ jsxs("p", {
					className: "flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
					children: [
						/* @__PURE__ */ jsx(LockKeyhole, { className: "h-2.5 w-2.5 text-neon-2" }),
						" ",
						t("messages.e2eChat")
					]
				})] })
			]
		}), /* @__PURE__ */ jsx("div", {
			className: "mt-3",
			children: /* @__PURE__ */ jsx(ChannelThread, {
				channel,
				membership,
				direct: true
			})
		})]
	});
}
export { ChatPage as component };
