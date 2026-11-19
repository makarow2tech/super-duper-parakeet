import { n as initials, t as handleColor } from "./krypt-ELaGncLW.js";
import { t as cn } from "./utils-Cet5ilrL.js";
import { jsx } from "react/jsx-runtime";
// src/components/krypt/HandleAvatar.jsx
function HandleAvatar({ name, size = 34, className, ring = false }) {
	const color = handleColor(name);
	return /* @__PURE__ */ jsx("span", {
		className: cn("relative grid shrink-0 place-items-center rounded-xl font-mono font-medium uppercase", ring && "ring-1 ring-white/10", className),
		style: {
			width: size,
			height: size,
			fontSize: Math.max(10, size * .34),
			color,
			background: `color-mix(in srgb, ${color} 14%, transparent)`,
			border: `1px solid color-mix(in srgb, ${color} 34%, transparent)`
		},
		"aria-hidden": "true",
		children: initials(name)
	});
}
export { HandleAvatar as t };
