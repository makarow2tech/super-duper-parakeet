import { t as Button } from "./button-D2C8FyBM.js";
import { n as returnToSearch } from "./authReturnTo-dPvV100E.js";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { Loader2 } from "lucide-react";
// src/components/auth/parts.jsx
function AuthError({ children }) {
	if (!children) return null;
	return /* @__PURE__ */ jsx("div", {
		role: "alert",
		className: "mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive",
		children
	});
}
function SubmitButton({ busy, busyLabel, children, ...props }) {
	return /* @__PURE__ */ jsx(Button, {
		type: "submit",
		className: "h-12 w-full font-medium",
		disabled: busy,
		...props,
		children: busy ? /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Loader2, {
			className: "mr-2 h-4 w-4 animate-spin",
			"aria-hidden": "true"
		}), busyLabel] }) : children
	});
}
function AuthLink({ to, returnTo, className = "font-medium text-primary hover:underline", children }) {
	return /* @__PURE__ */ jsx(Link, {
		to,
		search: returnToSearch(returnTo),
		className,
		children
	});
}
export { AuthLink as n, SubmitButton as r, AuthError as t };
