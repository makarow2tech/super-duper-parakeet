import { t as api } from "./client-C8lvYai7.js";
import { s as AuthLayout } from "./router-CRnjuvSx.js";
import { r as SubmitButton, t as AuthError } from "./parts-CWvsNoIN.js";
import { n as Input, t as Label } from "./label-zXmeSeAC.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { AlertTriangle, Lock } from "lucide-react";
// src/components/auth/ResetPasswordPage.jsx
function ResetPasswordPage() {
	const { t } = useLang();
	const token = new URLSearchParams(window.location.search).get("token");
	const [password, setPassword] = useState("");
	const [confirm, setConfirm] = useState("");
	const [error, setError] = useState("");
	const [busy, setBusy] = useState(false);
	async function submit(e) {
		e.preventDefault();
		setError("");
		if (password !== confirm) {
			setError(t("auth.reset.mismatch"));
			return;
		}
		setBusy(true);
		try {
			await api.auth.resetPassword({
				resetToken: token,
				newPassword: password
			});
			window.location.href = "/login";
		} catch (err) {
			setError(err.message || t("auth.reset.err"));
			setBusy(false);
		}
	}
	if (!token) return /* @__PURE__ */ jsx(AuthLayout, {
		icon: AlertTriangle,
		title: t("auth.reset.invalidTitle"),
		subtitle: t("auth.reset.invalidSubtitle"),
		footer: /* @__PURE__ */ jsx(Link, {
			to: "/forgot-password",
			className: "font-medium text-primary hover:underline",
			children: t("auth.reset.request")
		}),
		children: /* @__PURE__ */ jsx("p", {
			className: "text-center text-sm text-foreground",
			children: t("auth.reset.incomplete")
		})
	});
	return /* @__PURE__ */ jsxs(AuthLayout, {
		icon: Lock,
		title: t("auth.reset.title"),
		subtitle: t("auth.reset.subtitle"),
		children: [/* @__PURE__ */ jsx(AuthError, { children: error }), /* @__PURE__ */ jsxs("form", {
			onSubmit: submit,
			className: "space-y-4",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ jsx(Label, {
						htmlFor: "reset-password",
						children: t("auth.reset.label")
					}), /* @__PURE__ */ jsxs("div", {
						className: "relative",
						children: [/* @__PURE__ */ jsx(Lock, {
							className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
							"aria-hidden": "true"
						}), /* @__PURE__ */ jsx(Input, {
							id: "reset-password",
							type: "password",
							autoComplete: "new-password",
							autoFocus: true,
							placeholder: "••••••••",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							className: "h-12 pl-10",
							required: true
						})]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "space-y-2",
					children: [/* @__PURE__ */ jsx(Label, {
						htmlFor: "reset-confirm",
						children: t("auth.confirmPassword")
					}), /* @__PURE__ */ jsxs("div", {
						className: "relative",
						children: [/* @__PURE__ */ jsx(Lock, {
							className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
							"aria-hidden": "true"
						}), /* @__PURE__ */ jsx(Input, {
							id: "reset-confirm",
							type: "password",
							autoComplete: "new-password",
							placeholder: "••••••••",
							value: confirm,
							onChange: (e) => setConfirm(e.target.value),
							className: "h-12 pl-10",
							required: true
						})]
					})]
				}),
				/* @__PURE__ */ jsx(SubmitButton, {
					busy,
					busyLabel: t("auth.reset.busy"),
					children: t("auth.reset.submit")
				})
			]
		})]
	});
}
// src/routes/reset-password.jsx?tsr-split=component
var SplitComponent = ResetPasswordPage;
export { SplitComponent as component };
