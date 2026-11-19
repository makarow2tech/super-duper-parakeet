import { i as useLang, t as LANGUAGES } from "./i18n-BHElf6zP.js";
import { jsx, jsxs } from "react/jsx-runtime";
import { Globe } from "lucide-react";
// src/components/krypt/LanguageToggle.jsx
function LanguageToggle({ className = "" }) {
	const { lang, setLang, t } = useLang();
	return /* @__PURE__ */ jsxs("div", {
		role: "group",
		"aria-label": t("lang.aria"),
		className: `flex items-center gap-0.5 rounded-xl border border-white/[0.08] bg-white/[0.02] p-0.5 ${className}`,
		children: [/* @__PURE__ */ jsx(Globe, {
			className: "ml-1.5 mr-0.5 h-3 w-3 text-muted-foreground",
			"aria-hidden": "true"
		}), LANGUAGES.map(({ code, label }) => /* @__PURE__ */ jsx("button", {
			type: "button",
			onClick: () => setLang(code),
			"aria-pressed": lang === code,
			title: label,
			className: lang === code ? "rounded-lg bg-neon px-1.5 py-1 font-mono text-[9.5px] font-medium uppercase tracking-wider text-[hsl(var(--primary-foreground))]" : "rounded-lg px-1.5 py-1 font-mono text-[9.5px] uppercase tracking-wider text-muted-foreground transition hover:text-white",
			children: code
		}, code))]
	});
}
export { LanguageToggle as t };
