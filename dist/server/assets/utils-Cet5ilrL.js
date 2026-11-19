import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
// src/lib/utils.js
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
export { cn as t };
