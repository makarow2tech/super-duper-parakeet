import { s as AuthLayout } from "./router-CRnjuvSx.js";
import { n as AuthLink, r as SubmitButton, t as AuthError } from "./parts-CWvsNoIN.js";
import { n as Input, t as Label } from "./label-zXmeSeAC.js";
import { t as api } from "./client-C8lvYai7.js";
import { r as safeReturnTo } from "./authReturnTo-dPvV100E.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
import { Lock, LogIn, Mail, MailCheck } from "lucide-react";
// src/components/auth/LoginPage.jsx
function LoginPage() {
	const { t } = useLang();
	const returnTo = safeReturnTo();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	const [unverified, setUnverified] = useState(false);
	const [resending, setResending] = useState(false);
	async function submit(e) {
		e.preventDefault();
		setError("");
		setUnverified(false);
		setBusy(true);
		try {
			await api.auth.login(email, password);
			window.location.href = returnTo;
		} catch (err) {
			setError(err.message || t("auth.login.invalid"));
			setUnverified(err?.code === "email_unverified");
			setBusy(false);
		}
	}
	async function resend() {
		setResending(true);
		try {
			await api.auth.resendVerification(email);
			toast.success(t("auth.verify.resent"));
			setUnverified(false);
		} catch (err) {
			toast.error(err?.message || t("auth.verify.failed"));
		} finally {
			setResending(false);
		}
	}
	return /* @__PURE__ */ jsxs(AuthLayout, {
		icon: LogIn,
		title: t("auth.login.title"),
		subtitle: t("auth.login.subtitle"),
		children: [
			/* @__PURE__ */ jsx(AuthError, { children: error }),
			unverified && /* @__PURE__ */ jsxs("button", {
				type: "button",
				onClick: resend,
				disabled: resending,
				className: "mb-4 flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition hover:bg-primary/15 disabled:opacity-60",
				children: [/* @__PURE__ */ jsx(MailCheck, { className: "h-4 w-4" }), t("auth.verify.resend")]
			}),
			/* @__PURE__ */ jsxs("form", {
				onSubmit: submit,
				className: "space-y-4",
				children: [
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsx(Label, {
							htmlFor: "login-email",
							children: t("auth.login.identifier")
						}), /* @__PURE__ */ jsxs("div", {
							className: "relative",
							children: [/* @__PURE__ */ jsx(Mail, {
								className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
								"aria-hidden": "true"
							}), /* @__PURE__ */ jsx(Input, {
								id: "login-email",
								type: "text",
								autoComplete: "username",
								autoCapitalize: "none",
								spellCheck: false,
								autoFocus: true,
								placeholder: "you@example.com",
								value: email,
								onChange: (e) => setEmail(e.target.value),
								className: "h-12 pl-10",
								required: true
							})]
						})]
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "space-y-2",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "flex items-center justify-between",
							children: [/* @__PURE__ */ jsx(Label, {
								htmlFor: "login-password",
								children: t("auth.password")
							}), /* @__PURE__ */ jsx(AuthLink, {
								to: "/forgot-password",
								returnTo,
								className: "text-xs text-primary hover:underline",
								children: t("auth.forgot")
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "relative",
							children: [/* @__PURE__ */ jsx(Lock, {
								className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
								"aria-hidden": "true"
							}), /* @__PURE__ */ jsx(Input, {
								id: "login-password",
								type: "password",
								autoComplete: "current-password",
								placeholder: "••••••••",
								value: password,
								onChange: (e) => setPassword(e.target.value),
								className: "h-12 pl-10",
								required: true
							})]
						})]
					}),
					/* @__PURE__ */ jsx(SubmitButton, {
						busy,
						busyLabel: t("auth.login.busy"),
						children: t("auth.login.submit")
					})
				]
			}),
			/* @__PURE__ */ jsxs("p", {
				className: "mt-6 text-center text-sm text-muted-foreground",
				children: [
					t("auth.login.noAccount"),
					" ",
					/* @__PURE__ */ jsx(AuthLink, {
						to: "/register",
						returnTo,
						children: t("auth.login.createOne")
					})
				]
			})
		]
	});
}
// src/routes/login.jsx?tsr-split=component
var SplitComponent = LoginPage;
export { SplitComponent as component };
