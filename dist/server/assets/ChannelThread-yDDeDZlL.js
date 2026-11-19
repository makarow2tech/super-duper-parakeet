import { l as useAuth } from "./router-CRnjuvSx.js";
import { i as encryptMessage, n as useVault, r as decryptMessage } from "./VaultContext-mbaTeg3u.js";
import { N as subscribeMessages, O as listMessages, m as deleteMessageRecord, o as timeStamp, u as createMessageRecord } from "./krypt-ELaGncLW.js";
import { t as notifyMembers } from "./notify-BYMJEEJv.js";
import { t as HandleAvatar } from "./HandleAvatar-CMauiase.js";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, r as DialogDescription, t as Dialog } from "./dialog-C8brSl1W.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { t as api } from "./client-C8lvYai7.js";
import { useEffect, useRef, useState } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { ExternalLink, Flag, Loader2, LockKeyhole, Send, ShieldAlert, Trash2 } from "lucide-react";
// src/components/krypt/MessageText.jsx
var URL_RE = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
function hrefFor(url) {
	return url.toLowerCase().startsWith("www.") ? `https://${url}` : url;
}
function isExternal(href) {
	try {
		return new URL(href).host !== window.location.host;
	} catch {
		return true;
	}
}
function MessageText({ text }) {
	const { t } = useLang();
	const [pending, setPending] = useState(null);
	const nodes = [];
	let cursor = 0;
	for (const match of text.matchAll(URL_RE)) {
		const raw = match[0];
		const trailing = raw.match(/[.,;:!?)\]}]+$/)?.[0] ?? "";
		const url = trailing ? raw.slice(0, -trailing.length) : raw;
		if (match.index > cursor) nodes.push({
			type: "text",
			value: text.slice(cursor, match.index)
		});
		nodes.push({
			type: "link",
			value: url
		});
		cursor = match.index + url.length;
	}
	if (cursor < text.length) nodes.push({
		type: "text",
		value: text.slice(cursor)
	});
	function openLink(url) {
		const href = hrefFor(url);
		if (!isExternal(href)) {
			window.location.href = href;
			return;
		}
		setPending(href);
	}
	return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx("p", {
		className: "whitespace-pre-wrap break-words [overflow-wrap:anywhere]",
		children: nodes.map((node, index) => node.type === "link" ? /* @__PURE__ */ jsx("button", {
			type: "button",
			onClick: () => openLink(node.value),
			className: "break-all font-medium text-neon underline decoration-neon/40 underline-offset-2 transition hover:text-neon/80",
			children: node.value
		}, index) : /* @__PURE__ */ jsx("span", { children: node.value }, index))
	}), /* @__PURE__ */ jsx(Dialog, {
		open: !!pending,
		onOpenChange: (open) => !open && setPending(null),
		children: /* @__PURE__ */ jsxs(DialogContent, {
			className: "border-white/[0.08] bg-[hsl(var(--card))] sm:max-w-md",
			children: [
				/* @__PURE__ */ jsxs(DialogHeader, { children: [/* @__PURE__ */ jsxs(DialogTitle, {
					className: "flex items-center gap-2 font-heading text-lg tracking-[-0.02em] text-white",
					children: [
						/* @__PURE__ */ jsx(ShieldAlert, { className: "h-4 w-4 text-signal-yellow" }),
						" ",
						t("link.title")
					]
				}), /* @__PURE__ */ jsx(DialogDescription, {
					className: "text-[12.5px] text-muted-foreground",
					children: t("link.desc", { url: pending || "" })
				})] }),
				/* @__PURE__ */ jsx("p", {
					className: "break-all rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2 font-mono text-[11px] text-white",
					children: pending
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "flex justify-end gap-2",
					children: [/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => setPending(null),
						className: "h-9 rounded-xl border border-white/[0.08] px-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:text-white",
						children: t("link.cancel")
					}), /* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: () => {
							const href = pending;
							setPending(null);
							if (href) window.open(href, "_blank", "noopener,noreferrer");
						},
						className: "flex h-9 items-center gap-1.5 rounded-xl bg-neon px-3 font-mono text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90",
						children: [
							/* @__PURE__ */ jsx(ExternalLink, { className: "h-3.5 w-3.5" }),
							" ",
							t("link.open")
						]
					})]
				})
			]
		})
	})] });
}
// src/components/krypt/ReportDialog.jsx
function ReportDialog({ open, onOpenChange, target }) {
	const { t } = useLang();
	const [reason, setReason] = useState("");
	const [busy, setBusy] = useState(false);
	async function submit(event) {
		event.preventDefault();
		if (!target) return;
		const text = reason.trim();
		if (text.length < 3) {
			toast.error(t("report.errShort"));
			return;
		}
		setBusy(true);
		try {
			await api.entities.Report.create({
				target_type: target.type,
				target_id: target.id,
				target_handle: target.handle || "",
				reason: text,
				channel_id: target.channel_id || "",
				channel_slug: target.channel_slug || ""
			});
			toast.success(t("report.success"));
			setReason("");
			onOpenChange(false);
		} catch (error) {
			toast.error(error?.message || t("report.err"));
		} finally {
			setBusy(false);
		}
	}
	return /* @__PURE__ */ jsx(Dialog, {
		open,
		onOpenChange,
		children: /* @__PURE__ */ jsxs(DialogContent, {
			className: "max-w-md border-white/[0.08] bg-[hsl(var(--card))]",
			children: [/* @__PURE__ */ jsxs(DialogHeader, { children: [/* @__PURE__ */ jsxs(DialogTitle, {
				className: "flex items-center gap-2 font-heading text-lg text-white",
				children: [
					/* @__PURE__ */ jsx(Flag, { className: "h-4 w-4 text-signal-yellow" }),
					" ",
					t("report.title")
				]
			}), /* @__PURE__ */ jsx(DialogDescription, {
				className: "text-[12.5px] text-muted-foreground",
				children: t("report.desc", { handle: target?.handle ? `@${target.handle}` : t("common.user") })
			})] }), /* @__PURE__ */ jsxs("form", {
				onSubmit: submit,
				className: "space-y-3",
				children: [/* @__PURE__ */ jsx("textarea", {
					value: reason,
					onChange: (event) => setReason(event.target.value),
					rows: 4,
					maxLength: 500,
					autoFocus: true,
					placeholder: t("report.placeholder"),
					className: "w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-sm text-white outline-none focus:border-neon/40"
				}), /* @__PURE__ */ jsxs(DialogFooter, {
					className: "gap-2",
					children: [/* @__PURE__ */ jsx("button", {
						type: "button",
						onClick: () => onOpenChange(false),
						className: "h-9 rounded-xl border border-white/[0.08] px-3.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition hover:border-white/20 hover:text-white",
						children: t("link.cancel")
					}), /* @__PURE__ */ jsxs("button", {
						type: "submit",
						disabled: busy,
						className: "flex h-9 items-center gap-2 rounded-xl bg-neon px-3.5 font-mono text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 disabled:opacity-60",
						children: [busy ? /* @__PURE__ */ jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : /* @__PURE__ */ jsx(Flag, { className: "h-3.5 w-3.5" }), t("report.submit")]
					})]
				})]
			})]
		})
	});
}
// src/components/krypt/ChannelThread.jsx
function ChannelThread({ channel, membership, direct = false }) {
	const { t, lang } = useLang();
	const { user } = useAuth();
	const { profile, channelKey } = useVault();
	const [key, setKey] = useState(null);
	const [rows, setRows] = useState([]);
	const [texts, setTexts] = useState({});
	const [loading, setLoading] = useState(true);
	const [draft, setDraft] = useState("");
	const [sending, setSending] = useState(false);
	const [reportTarget, setReportTarget] = useState(null);
	const bottomRef = useRef(null);
	useEffect(() => {
		let alive = true;
		setLoading(true);
		setRows([]);
		setTexts({});
		(async () => {
			const resolved = await channelKey(channel, membership);
			if (!alive) return;
			setKey(resolved);
			const list = await listMessages(channel.id);
			if (!alive) return;
			setRows(list);
			setLoading(false);
			if (resolved) {
				const pairs = await Promise.all(list.map(async (row) => [row.id, await decryptMessage(row.cipher, resolved)]));
				if (alive) setTexts(Object.fromEntries(pairs));
			}
		})();
		return () => {
			alive = false;
		};
	}, [
		channel.id,
		membership?.id,
		channelKey
	]);
	useEffect(() => {
		return subscribeMessages(channel.id, async (event) => {
			if (event.type === "delete") {
				setRows((prev) => prev.filter((row) => row.id !== event.id));
				return;
			}
			if (event.type !== "create" || !key) return;
			const plain = await decryptMessage(event.data.cipher, key);
			setRows((prev) => prev.some((row) => row.id === event.id) ? prev : [...prev, event.data]);
			setTexts((prev) => ({
				...prev,
				[event.id]: plain
			}));
		});
	}, [channel.id, key]);
	useEffect(() => {
		bottomRef.current?.scrollIntoView({ block: "end" });
	}, [rows.length, loading]);
	async function send(event) {
		event.preventDefault();
		const text = draft.trim();
		if (!text || !key) return;
		setSending(true);
		try {
			const cipher = await encryptMessage(text, key);
			const created = await createMessageRecord({
				channel_id: channel.id,
				author_id: user.id,
				author_handle: profile?.handle || "",
				cipher,
				kind: "text"
			});
			setRows((prev) => prev.some((row) => row.id === created.id) ? prev : [...prev, created]);
			setTexts((prev) => ({
				...prev,
				[created.id]: text
			}));
			setDraft("");
			notifyMembers({ data: {
				channelId: channel.id,
				type: direct ? "dm" : "message",
				title: direct ? t("thread.dmTitle", { handle: profile?.handle || t("common.user") }) : t("thread.messageTitle", {
					handle: profile?.handle || t("common.user"),
					channel: channel.name
				})
			} }).catch(() => {});
		} catch (error) {
			toast.error(error?.message || t("thread.sendFailed"));
		} finally {
			setSending(false);
		}
	}
	async function remove(row) {
		await deleteMessageRecord(row.id);
		setRows((prev) => prev.filter((item) => item.id !== row.id));
	}
	return /* @__PURE__ */ jsxs("div", {
		className: "flex h-[calc(100vh-13rem)] min-h-[420px] flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[hsl(var(--card))]/50",
		children: [
			/* @__PURE__ */ jsxs("div", {
				className: "flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6",
				children: [
					loading && /* @__PURE__ */ jsx("div", {
						className: "grid place-items-center py-16",
						children: /* @__PURE__ */ jsx(Loader2, { className: "h-5 w-5 animate-spin text-neon" })
					}),
					!loading && !key && /* @__PURE__ */ jsxs("div", {
						className: "mx-auto max-w-sm rounded-2xl border border-neon-2/25 bg-neon-2/[0.05] px-4 py-6 text-center",
						children: [
							/* @__PURE__ */ jsx(LockKeyhole, { className: "mx-auto h-5 w-5 text-neon-2" }),
							/* @__PURE__ */ jsx("p", {
								className: "mt-3 text-sm text-white",
								children: t("thread.noKey")
							}),
							/* @__PURE__ */ jsx("p", {
								className: "mt-1 text-[12px] text-muted-foreground",
								children: t("thread.noKeyHint")
							})
						]
					}),
					!loading && key && rows.length === 0 && /* @__PURE__ */ jsx("p", {
						className: "py-12 text-center text-sm text-muted-foreground",
						children: t("thread.empty")
					}),
					rows.map((row) => {
						const mine = row.author_id === user.id;
						const text = texts[row.id];
						return /* @__PURE__ */ jsx("div", {
							className: mine ? "flex justify-end" : "flex justify-start",
							children: /* @__PURE__ */ jsxs("div", {
								className: mine ? "flex min-w-0 max-w-[85%] flex-row-reverse items-start gap-2" : "flex min-w-0 max-w-[85%] items-start gap-2",
								children: [/* @__PURE__ */ jsx(HandleAvatar, {
									name: row.author_handle || "?",
									size: 28
								}), /* @__PURE__ */ jsxs("div", {
									className: "min-w-0",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: mine ? "flex items-center justify-end gap-2" : "flex items-center gap-2",
											children: [/* @__PURE__ */ jsxs("span", {
												className: "font-mono text-[11px] text-white",
												children: ["@", row.author_handle || t("feed.user")]
											}), /* @__PURE__ */ jsx("span", {
												className: "font-mono text-[10px] text-muted-foreground",
												children: timeStamp(row.created_date, lang)
											})]
										}),
										/* @__PURE__ */ jsx("div", {
											className: mine ? "mt-1 max-w-full min-w-0 overflow-hidden rounded-2xl rounded-tr-sm border border-neon/25 bg-neon/[0.09] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white" : "mt-1 max-w-full min-w-0 overflow-hidden rounded-2xl rounded-tl-sm border border-white/[0.08] bg-white/[0.03] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-foreground/90",
											children: text === void 0 ? /* @__PURE__ */ jsx("span", {
												className: "font-mono text-[11px] text-muted-foreground",
												children: t("thread.decrypting")
											}) : text === "" ? /* @__PURE__ */ jsx("span", {
												className: "font-mono text-[11px] text-signal-yellow",
												children: t("thread.decryptFailed")
											}) : /* @__PURE__ */ jsx(MessageText, { text })
										}),
										mine ? /* @__PURE__ */ jsxs("button", {
											type: "button",
											onClick: () => remove(row),
											className: "mt-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 transition hover:text-signal-red",
											children: [
												/* @__PURE__ */ jsx(Trash2, { className: "h-2.5 w-2.5" }),
												" ",
												t("thread.delete")
											]
										}) : /* @__PURE__ */ jsxs("button", {
											type: "button",
											onClick: () => setReportTarget({
												type: "message",
												id: row.id,
												handle: row.author_handle,
												channel_id: channel.id,
												channel_slug: channel.slug
											}),
											className: "mt-1 flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground/60 transition hover:text-signal-yellow",
											children: [
												/* @__PURE__ */ jsx(Flag, { className: "h-2.5 w-2.5" }),
												" ",
												t("thread.report")
											]
										})
									]
								})]
							})
						}, row.id);
					}),
					/* @__PURE__ */ jsx("div", { ref: bottomRef })
				]
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: send,
				className: "border-t border-white/[0.07] bg-[hsl(var(--background))]/40 px-3 py-3 sm:px-4",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "flex items-end gap-2",
					children: [/* @__PURE__ */ jsx("textarea", {
						value: draft,
						onChange: (event) => setDraft(event.target.value),
						onKeyDown: (event) => {
							if (event.key === "Enter" && !event.shiftKey) {
								event.preventDefault();
								send(event);
							}
						},
						rows: 1,
						disabled: !key,
						placeholder: key ? t("thread.placeholder") : t("thread.noKeyPlaceholder"),
						className: "max-h-32 min-h-10 flex-1 resize-none rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-muted-foreground/60 focus:border-neon/40 disabled:opacity-60"
					}), /* @__PURE__ */ jsx("button", {
						type: "submit",
						disabled: !key || sending || !draft.trim(),
						className: "grid h-10 w-10 place-items-center rounded-xl bg-neon text-[hsl(var(--primary-foreground))] transition hover:bg-neon/90 disabled:opacity-40",
						"aria-label": t("thread.send"),
						children: sending ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(Send, { className: "h-4 w-4" })
					})]
				}), /* @__PURE__ */ jsxs("p", {
					className: "mt-2 flex items-center gap-1.5 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground/60",
					children: [
						/* @__PURE__ */ jsx(LockKeyhole, { className: "h-2.5 w-2.5" }),
						" ",
						t("thread.footer")
					]
				})]
			}),
			/* @__PURE__ */ jsx(ReportDialog, {
				open: !!reportTarget,
				onOpenChange: (open) => !open && setReportTarget(null),
				target: reportTarget
			})
		]
	});
}
export { ChannelThread as t };
