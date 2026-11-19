import { t as api } from "./client-C8lvYai7.js";
import { s as AuthLayout } from "./router-CRnjuvSx.js";
import { n as AuthLink, r as SubmitButton } from "./parts-CWvsNoIN.js";
import { n as Input, t as Label } from "./label-zXmeSeAC.js";
import { r as safeReturnTo } from "./authReturnTo-dPvV100E.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { useState } from "react";
import { jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, Mail } from "lucide-react";
// src/components/auth/ForgotPasswordPage.jsx
function ForgotPasswordPage() {
	const { t } = useLang();
	const returnTo = safeReturnTo();
	const [email, setEmail] = useState("");
	const [busy, setBusy] = useState(false);
	const [sent, setSent] = useState(false);
	async function submit(e) {
		e.preventDefault();
		setBusy(true);
		try {
			await api.auth.resetPasswordRequest(email);
		} catch {} finally {
			setBusy(false);
			setSent(true);
		}
	}
	return /* @__PURE__ */ jsxs(AuthLayout, {
		icon: Mail,
		title: t("auth.forgot.title"),
		subtitle: t("auth.forgot.subtitle"),
		children: [sent ? /* @__PURE__ */ jsx("p", {
			className: "text-center text-sm text-foreground",
			children: t("auth.forgot.sent")
		}) : /* @__PURE__ */ jsxs("form", {
			onSubmit: submit,
			className: "space-y-4",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "space-y-2",
				children: [/* @__PURE__ */ jsx(Label, {
					htmlFor: "forgot-email",
					children: t("auth.forgot.email")
				}), /* @__PURE__ */ jsxs("div", {
					className: "relative",
					children: [/* @__PURE__ */ jsx(Mail, {
						className: "absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground",
						"aria-hidden": "true"
					}), /* @__PURE__ */ jsx(Input, {
						id: "forgot-email",
						type: "email",
						autoComplete: "email",
						autoFocus: true,
						placeholder: "you@example.com",
						value: email,
						onChange: (e) => setEmail(e.target.value),
						className: "h-12 pl-10",
						required: true
					})]
				})]
			}), /* @__PURE__ */ jsx(SubmitButton, {
				busy,
				busyLabel: t("auth.forgot.busy"),
				children: t("auth.forgot.submit")
			})]
		}), /* @__PURE__ */ jsx("p", {
			className: "mt-6 text-center text-sm text-muted-foreground",
			children: /* @__PURE__ */ jsxs(AuthLink, {
				to: "/login",
				returnTo,
				children: [/* @__PURE__ */ jsx(ArrowLeft, {
					className: "mr-1 inline h-3 w-3",
					"aria-hidden": "true"
				}), t("auth.forgot.back")]
			})
		})]
	});
}
// src/routes/forgot-password.jsx?tsr-split=component
var SplitComponent = ForgotPasswordPage;
export { SplitComponent as component };
