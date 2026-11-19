import { t as api } from "./client-C8lvYai7.js";
import { s as AuthLayout } from "./router-CRnjuvSx.js";
import { n as AuthLink } from "./parts-CWvsNoIN.js";
import { i as useLang } from "./i18n-BHElf6zP.js";
import { useEffect, useState } from "react";
import { jsx } from "react/jsx-runtime";
import { toast } from "sonner";
import { Loader2, MailCheck, ShieldX } from "lucide-react";
// src/components/auth/VerifyEmailPage.jsx
/** /verify-email?token=... — kayıt sonrası e-postadaki bağlantı buraya gelir. */
function VerifyEmailPage() {
	const { t } = useLang();
	const [state, setState] = useState("checking");
	useEffect(() => {
		const token = new URLSearchParams(window.location.search).get("token");
		if (!token) {
			setState("invalid");
			return;
		}
		let alive = true;
		api.auth.verifyEmail(token).then(() => {
			if (!alive) return;
			setState("done");
			toast.success(t("auth.verify.done"));
			setTimeout(() => {
				window.location.href = "/";
			}, 900);
		}).catch(() => {
			if (alive) setState("invalid");
		});
		return () => {
			alive = false;
		};
	}, [t]);
	if (state === "checking") return /* @__PURE__ */ jsx(AuthLayout, {
		icon: MailCheck,
		title: t("auth.verify.title"),
		subtitle: t("auth.verify.checking"),
		children: /* @__PURE__ */ jsx("div", {
			className: "grid place-items-center py-6",
			children: /* @__PURE__ */ jsx(Loader2, { className: "h-5 w-5 animate-spin text-primary" })
		})
	});
	if (state === "done") return /* @__PURE__ */ jsx(AuthLayout, {
		icon: MailCheck,
		title: t("auth.verify.doneTitle"),
		subtitle: t("auth.verify.done"),
		children: /* @__PURE__ */ jsx("div", {
			className: "grid place-items-center py-6",
			children: /* @__PURE__ */ jsx(Loader2, { className: "h-5 w-5 animate-spin text-primary" })
		})
	});
	return /* @__PURE__ */ jsx(AuthLayout, {
		icon: ShieldX,
		title: t("auth.verify.failedTitle"),
		subtitle: t("auth.verify.failed"),
		children: /* @__PURE__ */ jsx("div", {
			className: "space-y-4 text-sm text-muted-foreground",
			children: /* @__PURE__ */ jsx(AuthLink, {
				to: "/login",
				className: "inline-block font-medium text-primary hover:underline",
				children: t("auth.verify.back")
			})
		})
	});
}
// src/routes/verify-email.jsx?tsr-split=component
var SplitComponent = VerifyEmailPage;
export { SplitComponent as component };
