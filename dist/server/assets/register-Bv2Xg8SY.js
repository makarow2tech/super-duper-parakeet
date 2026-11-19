import { t as api } from "./client-C8lvYai7.js";
import { s as AuthLayout } from "./router-CRnjuvSx.js";
import { n as Input, t as Label } from "./label-zXmeSeAC.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { n as AuthLink, r as SubmitButton, t as AuthError } from "./parts-CWvsNoIN.js";
import { r as safeReturnTo } from "./authReturnTo-dPvV100E.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { KeyRound, Loader2, Lock, Mail, MailCheck, MessageCircle, RefreshCw, UserPlus, UserRound } from "lucide-react";
// src/components/auth/CaptchaField.jsx
/**
* Kayıt formu insan doğrulaması.
* provider "local" ise sunucudan gelen yazıyı kutuya yazdırır;
* "turnstile" ise Cloudflare widget'ını yükler.
*/
function CaptchaField({ provider, challenge, siteKey, answer, onAnswer, onToken, onRefresh }) {
	const { t } = useLang();
	if (provider === "turnstile") return /* @__PURE__ */ jsx(Turnstile, {
		siteKey,
		onToken
	});
	if (provider !== "local" || !challenge) return null;
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ jsx(Label, {
				htmlFor: "register-captcha",
				children: t("auth.captcha.label")
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-[12.5px] text-muted-foreground",
				children: t("auth.captcha.instruction")
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ jsx("div", {
					className: "flex-1 select-none rounded-lg border border-primary/25 bg-primary/[0.07] px-3 py-2.5 text-center font-mono text-[15px] tracking-[0.12em] text-primary",
					"aria-live": "polite",
					children: challenge.text
				}), /* @__PURE__ */ jsx("button", {
					type: "button",
					onClick: onRefresh,
					title: t("auth.captcha.refresh"),
					"aria-label": t("auth.captcha.refresh"),
					className: "grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-white/[0.08] text-muted-foreground transition hover:border-primary/40 hover:text-primary",
					children: /* @__PURE__ */ jsx(RefreshCw, { className: "h-4 w-4" })
				})]
			}),
			/* @__PURE__ */ jsx(Input, {
				id: "register-captcha",
				value: answer,
				onChange: (event) => onAnswer(event.target.value),
				placeholder: t("auth.captcha.placeholder"),
				autoComplete: "off",
				autoCapitalize: "none",
				spellCheck: false,
				className: "h-11 font-mono",
				required: true
			})
		]
	});
}
function Turnstile({ siteKey, onToken }) {
	const box = useRef(null);
	const [error, setError] = useState("");
	useEffect(() => {
		if (!siteKey) return void 0;
		let widget = null;
		let cancelled = false;
		const render = () => {
			if (cancelled || !box.current || !window.turnstile) return;
			widget = window.turnstile.render(box.current, {
				sitekey: siteKey,
				theme: "dark",
				callback: (token) => onToken(token),
				"expired-callback": () => onToken(""),
				"error-callback": () => onToken("")
			});
		};
		if (window.turnstile) render();
		else {
			const existing = document.querySelector("script[data-krypt-turnstile]");
			if (existing) existing.addEventListener("load", render);
			else {
				const script = document.createElement("script");
				script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
				script.async = true;
				script.defer = true;
				script.dataset.kryptTurnstile = "1";
				script.addEventListener("load", render);
				script.addEventListener("error", () => setError("Turnstile yüklenemedi"));
				document.head.appendChild(script);
			}
		}
		return () => {
			cancelled = true;
			const element = document.querySelector("script[data-krypt-turnstile]");
			if (element) element.removeEventListener("load", render);
			if (widget !== null && window.turnstile) window.turnstile.remove(widget);
		};
	}, [siteKey, onToken]);
	if (!siteKey) return /* @__PURE__ */ jsx("p", {
		className: "rounded-lg border border-signal-yellow/30 bg-signal-yellow/[0.08] p-3 text-[12.5px] text-signal-yellow",
		children: "Turnstile seçili ama TURNSTILE_SITE_KEY boş. Sunucudaki .env dosyasını doldur."
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "space-y-2",
		children: [
			/* @__PURE__ */ jsx("span", {
				className: "mono-label",
				children: "güvenlik doğrulaması"
			}),
			/* @__PURE__ */ jsx("div", { ref: box }),
			error && /* @__PURE__ */ jsx("p", {
				className: "text-[12px] text-signal-red",
				children: error
			})
		]
	});
}
// src/components/auth/RegisterPage.jsx
/**
* /register sayfası.
* Alanlar sunucunun kayıt yöntemine göre değişir:
*   email    → e-posta + parola, doğrulama postası
*   invite   → kullanıcı adı + parola + davet kodu
*   captcha  → kullanıcı adı + parola + kendi captcha'mız
*   telegram → kullanıcı adı + parola, botta /start <kod>
*   open     → kullanıcı adı + parola
*/
function RegisterPage() {
	const { t } = useLang();
	const returnTo = safeReturnTo();
	const [info, setInfo] = useState(null);
	const [challenge, setChallenge] = useState(null);
	const [username, setUsername] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [inviteCode, setInviteCode] = useState("");
	const [captchaAnswer, setCaptchaAnswer] = useState("");
	const [turnstileToken, setTurnstileToken] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const [sentTo, setSentTo] = useState("");
	const [mailSent, setMailSent] = useState(true);
	const [telegram, setTelegram] = useState(null);
	const [telegramStatus, setTelegramStatus] = useState("pending");
	const [telegramError, setTelegramError] = useState("");
	const method = info?.registration_method || "email";
	const captchaType = info?.captcha_provider || "none";
	const loadChallenge = useCallback(async () => {
		try {
			const data = await api.captcha.get();
			setChallenge(data?.provider === "local" ? data.challenge : null);
		} catch {
			setChallenge(null);
		}
		setCaptchaAnswer("");
	}, []);
	useEffect(() => {
		let alive = true;
		api.settings.get().then((data) => alive && setInfo(data)).catch(() => {});
		loadChallenge();
		return () => {
			alive = false;
		};
	}, [loadChallenge]);
	useEffect(() => {
		if (!telegram?.code) return void 0;
		let stopped = false;
		let timer;
		const tick = async () => {
			try {
				const result = await api.auth.telegramStatus(telegram.code);
				if (stopped) return;
				setTelegramStatus(result.status);
				if (result.status === "verified") {
					window.location.href = returnTo;
					return;
				}
				if (result.status === "expired" || result.status === "unknown") return;
			} catch {}
			if (!stopped) timer = setTimeout(tick, 2500);
		};
		timer = setTimeout(tick, 1500);
		return () => {
			stopped = true;
			clearTimeout(timer);
		};
	}, [telegram, returnTo]);
	async function resendTelegram() {
		setBusy(true);
		setTelegramError("");
		try {
			const result = await api.auth.telegramResend(username.trim(), password);
			setTelegram(result.telegram);
			setTelegramStatus("pending");
		} catch (err) {
			setTelegramError(err.message || t("auth.telegram.resendFailed"));
		} finally {
			setBusy(false);
		}
	}
	async function register(e) {
		e.preventDefault();
		setError("");
		if (password.length < 8) {
			setError(t("auth.register.errShort"));
			return;
		}
		if (password !== confirm) {
			setError(t("auth.register.errMismatch"));
			return;
		}
		const payload = { password };
		if (method === "email") payload.email = email.trim();
		else payload.username = username.trim();
		if (method === "invite") payload.invite_code = inviteCode.trim();
		if (captchaType === "local") {
			payload.captcha_id = challenge?.id || "";
			payload.captcha_answer = captchaAnswer;
		}
		if (captchaType === "turnstile") payload.turnstile_token = turnstileToken;
		setBusy(true);
		try {
			const result = await api.auth.register(payload);
			if (result.verification_required && result.method === "telegram") {
				setTelegram(result.telegram);
				setTelegramStatus("pending");
				setBusy(false);
				return;
			}
			if (result.verification_required) {
				setSentTo(result.email || email);
				setMailSent(result.mail_sent !== false);
				setBusy(false);
				return;
			}
			window.location.href = returnTo;
		} catch (err) {
			setError(err.message || t("auth.register.err"));
			setBusy(false);
			if (captchaType !== "none") await loadChallenge();
		}
	}
	if (telegram) {
		const done = telegramStatus === "verified";
		const expired = telegramStatus === "expired" || telegramStatus === "unknown";
		return /* @__PURE__ */ jsx(AuthLayout, {
			icon: MessageCircle,
			title: t("auth.telegram.title"),
			subtitle: t("auth.telegram.subtitle"),
			children: /* @__PURE__ */ jsxs("div", {
				className: "space-y-4 text-sm text-muted-foreground",
				children: [
					/* @__PURE__ */ jsx("p", { children: t("auth.telegram.hint") }),
					/* @__PURE__ */ jsxs("code", {
						className: "block select-all rounded-lg bg-primary/10 px-3 py-2.5 text-center font-mono text-[15px] tracking-[0.12em] text-foreground",
						children: ["/start ", telegram.code]
					}),
					/* @__PURE__ */ jsxs("a", {
						href: telegram.bot_url,
						target: "_blank",
						rel: "noreferrer",
						className: "flex h-11 items-center justify-center gap-2 rounded-lg bg-primary font-medium text-primary-foreground transition hover:bg-primary/90",
						children: [/* @__PURE__ */ jsx(MessageCircle, { className: "h-4 w-4" }), t("auth.telegram.open")]
					}),
					/* @__PURE__ */ jsx("p", {
						className: expired ? "rounded-lg border border-signal-yellow/30 bg-signal-yellow/[0.08] p-3 text-[13px] text-signal-yellow" : "text-[13px]",
						children: expired ? t("auth.telegram.expired") : done ? t("auth.telegram.verified") : t("auth.telegram.waiting")
					}),
					expired && /* @__PURE__ */ jsxs("button", {
						type: "button",
						onClick: resendTelegram,
						disabled: busy,
						className: "flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 font-medium text-primary transition hover:bg-primary/15 disabled:opacity-60",
						children: [busy ? /* @__PURE__ */ jsx(Loader2, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ jsx(RefreshCw, { className: "h-4 w-4" }), t("auth.telegram.resend")]
					}),
					telegramError && /* @__PURE__ */ jsx("p", {
						className: "rounded-lg border border-signal-red/30 bg-signal-red/[0.08] p-3 text-[13px] text-signal-red",
						children: telegramError
					}),
					/* @__PURE__ */ jsx(AuthLink, {
						to: "/login",
						returnTo,
						className: "inline-block font-medium text-primary hover:underline",
						children: t("auth.verify.back")
					})
				]
			})
		});
	}
	if (sentTo) return /* @__PURE__ */ jsx(AuthLayout, {
		icon: MailCheck,
		title: t("auth.verify.title"),
		subtitle: t("auth.verify.subtitle"),
		children: /* @__PURE__ */ jsxs("div", {
			className: "space-y-4 text-sm text-muted-foreground",
			children: [
				/* @__PURE__ */ jsx("p", {
					className: "rounded-lg bg-primary/10 p-3 text-foreground",
					children: t("auth.verify.sent", { email: sentTo })
				}),
				/* @__PURE__ */ jsx("p", {
					className: "text-[13px]",
					children: t("auth.verify.hint")
				}),
				!mailSent && /* @__PURE__ */ jsx("p", {
					className: "rounded-lg border border-signal-yellow/30 bg-signal-yellow/[0.08] p-3 text-[13px] text-signal-yellow",
					children: t("auth.verify.mailFailed")
				}),
				/* @__PURE__ */ jsx(AuthLink, {
					to: "/login",
					returnTo,
					className: "inline-block font-medium text-primary hover:underline",
					children: t("auth.verify.back")
				})
			]
		})
	});
	return /* @__PURE__ */ jsxs(AuthLayout, {
		icon: UserPlus,
		title: t("auth.register.title"),
		subtitle: t("auth.register.subtitle"),
		children: [
			/* @__PURE__ */ jsx(AuthError, { children: error }),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: register,
				className: "space-y-4",
				children: [
					method !== "email" && /* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ jsx(Label, {
								htmlFor: "register-username",
								children: t("auth.username")
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "relative",
								children: [/* @__PURE__ */ jsx(UserRound, {
									className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
									"aria-hidden": "true"
								}), /* @__PURE__ */ jsx(Input, {
									id: "register-username",
									type: "text",
									autoComplete: "username",
									autoFocus: true,
									autoCapitalize: "none",
									spellCheck: false,
									placeholder: t("auth.username.placeholder"),
									value: username,
									onChange: (e) => setUsername(e.target.value),
									className: "h-12 pl-10 font-mono",
									disabled: busy,
									required: true
								})]
							}),
							/* @__PURE__ */ jsx("p", {
								className: "font-mono text-[10px] uppercase tracking-wider text-muted-foreground",
								children: t("auth.username.hint")
							})
						]
					}),
					method === "email" && /* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "register-email",
							children: t("auth.email")
						}), /* @__PURE__ */ jsxs("div", {
							className: "relative",
							children: [/* @__PURE__ */ jsx(Mail, {
								className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
								"aria-hidden": "true"
							}), /* @__PURE__ */ jsx(Input, {
								id: "register-email",
								type: "email",
								autoComplete: "email",
								autoFocus: true,
								placeholder: "you@example.com",
								value: email,
								onChange: (e) => setEmail(e.target.value),
								className: "h-12 pl-10",
								disabled: busy,
								required: true
							})]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "register-password",
							children: t("auth.password")
						}), /* @__PURE__ */ jsxs("div", {
							className: "relative",
							children: [/* @__PURE__ */ jsx(Lock, {
								className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
								"aria-hidden": "true"
							}), /* @__PURE__ */ jsx(Input, {
								id: "register-password",
								type: "password",
								autoComplete: "new-password",
								placeholder: "••••••••",
								value: password,
								onChange: (e) => setPassword(e.target.value),
								className: "h-12 pl-10",
								disabled: busy,
								required: true
							})]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "register-confirm",
							children: t("auth.confirmPassword")
						}), /* @__PURE__ */ jsxs("div", {
							className: "relative",
							children: [/* @__PURE__ */ jsx(Lock, {
								className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
								"aria-hidden": "true"
							}), /* @__PURE__ */ jsx(Input, {
								id: "register-confirm",
								type: "password",
								autoComplete: "new-password",
								placeholder: "••••••••",
								value: confirm,
								onChange: (e) => setConfirm(e.target.value),
								className: "h-12 pl-10",
								disabled: busy,
								required: true
							})]
						})]
					}),
					method === "invite" && /* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [
							/* @__PURE__ */ jsx(Label, {
								htmlFor: "register-invite",
								children: t("auth.invite.label")
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "relative",
								children: [/* @__PURE__ */ jsx(KeyRound, {
									className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
									"aria-hidden": "true"
								}), /* @__PURE__ */ jsx(Input, {
									id: "register-invite",
									type: "text",
									autoComplete: "off",
									autoCapitalize: "characters",
									spellCheck: false,
									placeholder: t("auth.invite.placeholder"),
									value: inviteCode,
									onChange: (e) => setInviteCode(e.target.value.toUpperCase()),
									className: "h-12 pl-10 font-mono tracking-[0.15em]",
									disabled: busy,
									required: true
								})]
							}),
							/* @__PURE__ */ jsx("p", {
								className: "text-[11.5px] text-muted-foreground",
								children: t("auth.invite.hint")
							})
						]
					}),
					/* @__PURE__ */ jsx(CaptchaField, {
						provider: captchaType,
						challenge,
						siteKey: info?.turnstile_site_key,
						answer: captchaAnswer,
						onAnswer: setCaptchaAnswer,
						onToken: setTurnstileToken,
						onRefresh: loadChallenge
					}),
					/* @__PURE__ */ jsx(SubmitButton, {
						busy,
						busyLabel: t("auth.register.busy"),
						children: t("auth.register.submit")
					})
				]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "mt-6 text-center text-sm text-muted-foreground",
				children: [
					t("auth.register.haveAccount"),
					" ",
					/* @__PURE__ */ jsx(AuthLink, {
						to: "/login",
						returnTo,
						children: t("auth.register.login")
					})
				]
			})
		]
	});
}
// src/routes/register.jsx?tsr-split=component
var SplitComponent = RegisterPage;
export { SplitComponent as component };
