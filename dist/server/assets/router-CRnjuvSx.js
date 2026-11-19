import { t as __exportAll } from "./rolldown-runtime-D8jQpDG7.js";
import { t as Button } from "./button-D2C8FyBM.js";
import { i as useLang, n as LangProvider, r as tStatic } from "./i18n-BHElf6zP.js";
import { t as api } from "./client-C8lvYai7.js";
import { t as currentUrl } from "./authReturnTo-dPvV100E.js";
import { t as LanguageToggle } from "./LanguageToggle-QcxRiqlP.js";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ErrorComponent, HeadContent, Link, Outlet, Scripts, createFileRoute, createRootRoute, createRouter, lazyRouteComponent, redirect, rootRouteId, useMatch, useRouter } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import { useTheme } from "next-themes";
import { Toaster } from "sonner";
import { QueryClient, queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserX } from "lucide-react";
// src/components/DefaultCatchBoundary.jsx
function DefaultCatchBoundary({ error }) {
	const { t } = useLang();
	const router = useRouter();
	const isRoot = useMatch({
		strict: false,
		select: (state) => state.id === rootRouteId
	});
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto flex max-w-2xl flex-col items-center gap-4 py-24",
		children: [/* @__PURE__ */ jsx(ErrorComponent, { error }), /* @__PURE__ */ jsxs("div", {
			className: "flex gap-2",
			children: [/* @__PURE__ */ jsx(Button, {
				variant: "outline",
				onClick: () => router.invalidate(),
				children: t("error.tryAgain")
			}), /* @__PURE__ */ jsx(Button, {
				asChild: true,
				children: isRoot ? /* @__PURE__ */ jsx(Link, {
					to: "/",
					children: t("error.home")
				}) : /* @__PURE__ */ jsx(Link, {
					to: "/",
					onClick: (e) => {
						e.preventDefault();
						window.history.back();
					},
					children: t("error.goBack")
				})
			})]
		})]
	});
}
// src/components/NotFound.jsx
function NotFound({ children }) {
	const { t } = useLang();
	return /* @__PURE__ */ jsxs("div", {
		className: "mx-auto flex max-w-lg flex-col items-center gap-4 py-24 text-center",
		children: [
			/* @__PURE__ */ jsx("p", {
				className: "text-6xl font-semibold tracking-tight",
				children: "404"
			}),
			/* @__PURE__ */ jsx("p", {
				className: "text-muted-foreground",
				children: children ?? t("notFound.text")
			}),
			/* @__PURE__ */ jsxs("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ jsx(Button, {
					variant: "outline",
					onClick: () => window.history.back(),
					children: t("notFound.back")
				}), /* @__PURE__ */ jsx(Button, {
					asChild: true,
					children: /* @__PURE__ */ jsx(Link, {
						to: "/",
						children: t("notFound.home")
					})
				})]
			})
		]
	});
}
// src/components/ui/sonner.jsx
var Toaster$1 = ({ ...props }) => {
	const { theme = "system" } = useTheme();
	return /* @__PURE__ */ jsx(Toaster, {
		theme,
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
// src/lib/AuthContext.jsx
/**
* The visitor, resolved once per page load and cached in the router's QueryClient:
* the login gate (src/components/auth/AuthGate.jsx) reads it with
* `context.queryClient.ensureQueryData(authQuery)`, components with `useAuth()`.
* Resolves to `{ user, error }`: an anonymous visitor (no token, or a 401/403) is `{ user: null, error: null }`.
* Anything else, an outage (429, 503) or a request that never got an answer, rejects instead,
* so it is never cached as "signed out" and the next read asks again.
*/
var authQuery = queryOptions({
	queryKey: ["auth", "me"],
	queryFn: async () => {
		if (!api.auth.hasToken()) return {
			user: null,
			error: null
		};
		try {
			return {
				user: await api.auth.me(),
				error: null
			};
		} catch (err) {
			if (err?.status === 401 || err?.status === 403) return {
				user: null,
				error: null
			};
			throw err;
		}
	},
	staleTime: Infinity,
	retry: false
});
var AuthContext = createContext(null);
/**
* Client-side session state. The server renders every page anonymously and the
* query only runs in the browser after hydration, so the first client render
* matches the server markup. Gate user-specific UI on `isLoadingAuth`.
*/
function AuthProvider({ children }) {
	const queryClient = useQueryClient();
	const { data, error, isPending } = useQuery(authQuery);
	const value = useMemo(() => ({
		user: data?.user ?? null,
		isAuthenticated: !!data?.user,
		isLoadingAuth: isPending,
		authError: data?.error ?? (error ? {
			type: "unknown",
			message: error.message ?? "Failed to load session"
		} : null),
		refresh: () => queryClient.fetchQuery({
			...authQuery,
			staleTime: 0
		}),
		logout: () => {
			queryClient.setQueryData(authQuery.queryKey, {
				user: null,
				error: null
			});
			api.auth.logout(window.location.origin);
		},
		navigateToLogin: () => {
			window.location.href = `/login?returnTo=${encodeURIComponent(currentUrl())}`;
		}
	}), [
		data,
		error,
		isPending,
		queryClient
	]);
	return /* @__PURE__ */ jsx(AuthContext.Provider, {
		value,
		children
	});
}
function useAuth() {
	const ctx = useContext(AuthContext);
	if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
	return ctx;
}
// src/lib/SiteContext.jsx
var DEFAULTS = {
	site_name: "KRYPT",
	motd: "",
	allow_registration: true,
	require_email_verification: true
};
var SiteContext = createContext(DEFAULTS);
var cached = null;
function SiteProvider({ children }) {
	const [site, setSite] = useState(cached || DEFAULTS);
	useEffect(() => {
		let alive = true;
		api.settings.get().then((data) => {
			cached = {
				...DEFAULTS,
				...data || {}
			};
			if (alive) setSite(cached);
		}).catch(() => {});
		return () => {
			alive = false;
		};
	}, []);
	return /* @__PURE__ */ jsx(SiteContext.Provider, {
		value: site,
		children
	});
}
function useSite() {
	return useContext(SiteContext);
}
// src/index.css?url
var src_default = "/assets/index-DdUi_UJ3.css";
// src/routes/__root.jsx
var Route$16 = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: tStatic("titles.root") },
			{
				name: "description",
				content: tStatic("meta.description")
			}
		],
		links: [
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap"
			},
			{
				rel: "stylesheet",
				href: src_default
			}
		]
	}),
	errorComponent: DefaultCatchBoundary,
	notFoundComponent: () => /* @__PURE__ */ jsx(NotFound, {}),
	shellComponent: RootDocument,
	component: RootComponent
});
function RootComponent() {
	return /* @__PURE__ */ jsx(AuthProvider, { children: /* @__PURE__ */ jsxs(SiteProvider, { children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(Toaster$1, {})] }) });
}
function RootDocument({ children }) {
	return /* @__PURE__ */ jsxs("html", {
		lang: "tr",
		className: "dark",
		children: [/* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }), /* @__PURE__ */ jsx("body", {
			"data-react-root": "true",
			children: /* @__PURE__ */ jsxs(LangProvider, { children: [children, /* @__PURE__ */ jsx(Scripts, {})] })
		})]
	});
}
// src/components/auth/AuthLayout.jsx
function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
	return /* @__PURE__ */ jsxs("div", {
		className: "relative flex min-h-screen items-center justify-center bg-background px-4 py-8 text-foreground",
		children: [/* @__PURE__ */ jsx("div", {
			className: "absolute right-4 top-4",
			children: /* @__PURE__ */ jsx(LanguageToggle, {})
		}), /* @__PURE__ */ jsxs("div", {
			className: "w-full max-w-md",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "mb-8 text-center",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary",
							children: /* @__PURE__ */ jsx(Icon, {
								className: "h-7 w-7 text-primary-foreground",
								"aria-hidden": "true"
							})
						}),
						/* @__PURE__ */ jsx("h1", {
							className: "text-3xl font-bold tracking-tight",
							children: title
						}),
						subtitle && /* @__PURE__ */ jsx("p", {
							className: "mt-2 text-muted-foreground",
							children: subtitle
						})
					]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "rounded-2xl border border-border bg-card p-8 text-card-foreground shadow-sm",
					children
				}),
				footer && /* @__PURE__ */ jsx("p", {
					className: "mt-6 text-center text-sm text-muted-foreground",
					children: footer
				})
			]
		})]
	});
}
// src/components/auth/UserNotRegistered.jsx
function UserNotRegistered() {
	const { t } = useLang();
	const { logout } = useAuth();
	return /* @__PURE__ */ jsxs(AuthLayout, {
		icon: UserX,
		title: t("auth.notRegistered.title"),
		subtitle: t("auth.notRegistered.subtitle"),
		children: [/* @__PURE__ */ jsx("p", {
			className: "mb-6 text-center text-sm text-foreground",
			children: t("auth.notRegistered.body")
		}), /* @__PURE__ */ jsx(Button, {
			variant: "outline",
			className: "h-12 w-full font-medium",
			onClick: logout,
			children: t("auth.notRegistered.signOut")
		})]
	});
}
// src/components/auth/AuthGate.jsx
var NotRegisteredError = class extends Error {};
/**
* The login gate for a pathless layout route (src/routes/_authed.jsx), which gates
* every route under src/routes/_authed/ (their URLs carry no "_authed" segment):
*
*   createFileRoute("/_authed")({ ssr: false, beforeLoad: requireSignedIn, errorComponent: AuthGateError })
*
* TanStack Router's authenticated-routes pattern: beforeLoad reads the visitor from the
* router context (the QueryClient's cached `authQuery`, shared with useAuth()), so a
* child's loader never runs as an anonymous visitor. Signed out → /login with the way
* back; signed in but not a user of this app → the not-registered screen. Children read
* the visitor with `Route.useRouteContext().user`. `ssr: false` — the server is anonymous,
* so these pages render in the browser only, and children inherit that.
*/
async function requireSignedIn({ context, location }) {
	const { user, error } = await context.queryClient.ensureQueryData(authQuery);
	if (user) return { user };
	if (error?.type === "user_not_registered") throw new NotRegisteredError(error.message);
	throw redirect({
		to: "/login",
		search: {
			returnTo: location.href,
			from_url: location.href
		},
		reloadDocument: true
	});
}
function AuthGateError({ error }) {
	return error instanceof NotRegisteredError ? /* @__PURE__ */ jsx(UserNotRegistered, {}) : /* @__PURE__ */ jsx(DefaultCatchBoundary, { error });
}
// src/routes/_authed.jsx
var $$splitComponentImporter$15 = () => import("./_authed-DHgkRHIj.js");
var $$splitErrorComponentImporter = () => import("./_authed-BWGbJ7kd.js");
var Route$15 = createFileRoute("/_authed")({
	ssr: false,
	beforeLoad: requireSignedIn,
	errorComponent: lazyRouteComponent($$splitErrorComponentImporter, "errorComponent"),
	component: lazyRouteComponent($$splitComponentImporter$15, "component")
});
// src/routes/forgot-password.jsx
var $$splitComponentImporter$14 = () => import("./forgot-password-DdEh7v7W.js");
var Route$14 = createFileRoute("/forgot-password")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$14, "component")
});
// src/routes/login.jsx
var $$splitComponentImporter$13 = () => import("./login-O8bYl4BT.js");
var Route$13 = createFileRoute("/login")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$13, "component")
});
// src/routes/register.jsx
var $$splitComponentImporter$12 = () => import("./register-Bv2Xg8SY.js");
var Route$12 = createFileRoute("/register")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
// src/routes/reset-password.jsx
var $$splitComponentImporter$11 = () => import("./reset-password-BjidF06v.js");
var Route$11 = createFileRoute("/reset-password")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
// src/routes/verify-email.jsx
var $$splitComponentImporter$10 = () => import("./verify-email-DWmj_ic2.js");
var Route$10 = createFileRoute("/verify-email")({
	ssr: false,
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
// src/routes/_authed/index.jsx
var $$splitComponentImporter$9 = () => import("./_authed-2_u66ZCN.js");
var Route$9 = createFileRoute("/_authed/")({
	validateSearch: (search) => ({ q: search.q }),
	head: () => ({ meta: [{ title: tStatic("titles.feed") }, {
		name: "description",
		content: tStatic("meta.feedDescription")
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
// src/routes/_authed/admin.jsx
var $$splitComponentImporter$8 = () => import("./admin-BihO9aQe.js");
var Route$8 = createFileRoute("/_authed/admin")({
	head: () => ({ meta: [{ title: tStatic("titles.admin") }] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
// src/routes/_authed/notifications.jsx
var $$splitComponentImporter$7 = () => import("./notifications-tWTGD_rC.js");
var Route$7 = createFileRoute("/_authed/notifications")({
	head: () => ({ meta: [{ title: tStatic("titles.notifications") }] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
// src/routes/_authed/settings.jsx
var $$splitComponentImporter$6 = () => import("./settings-lW56pllB.js");
var Route$6 = createFileRoute("/_authed/settings")({
	head: () => ({ meta: [{ title: tStatic("titles.settings") }] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
// src/routes/_authed/channels.index.jsx
var $$splitComponentImporter$5 = () => import("./channels.index-CR4_UIYE.js");
var Route$5 = createFileRoute("/_authed/channels/")({
	head: () => ({ meta: [{ title: tStatic("titles.channels") }] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
// src/routes/_authed/channels.$slug.jsx
var $$splitComponentImporter$4 = () => import("./channels._slug-A0fBBAW6.js");
var Route$4 = createFileRoute("/_authed/channels/$slug")({
	head: () => ({ meta: [{ title: tStatic("titles.channel") }] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
// src/routes/_authed/communities.index.jsx
var $$splitComponentImporter$3 = () => import("./communities.index-esMDQNAf.js");
var Route$3 = createFileRoute("/_authed/communities/")({
	head: () => ({ meta: [{ title: tStatic("titles.communities") }] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
// src/routes/_authed/communities.$slug.jsx
var $$splitComponentImporter$2 = () => import("./communities._slug-APYXmgm4.js");
var Route$2 = createFileRoute("/_authed/communities/$slug")({
	head: () => ({ meta: [{ title: tStatic("titles.community") }] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
// src/routes/_authed/messages.index.jsx
var $$splitComponentImporter$1 = () => import("./messages.index-iXIRmzO0.js");
var Route$1 = createFileRoute("/_authed/messages/")({
	head: () => ({ meta: [{ title: tStatic("titles.messages") }] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
// src/routes/_authed/messages.$slug.jsx
var $$splitComponentImporter = () => import("./messages._slug-DHhM1DQK.js");
var Route = createFileRoute("/_authed/messages/$slug")({
	head: () => ({ meta: [{ title: tStatic("titles.chat") }] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
// src/routeTree.gen.ts
var AuthedRoute = Route$15.update({
	id: "/_authed",
	getParentRoute: () => Route$16
});
var ForgotPasswordRoute = Route$14.update({
	id: "/forgot-password",
	path: "/forgot-password",
	getParentRoute: () => Route$16
});
var LoginRoute = Route$13.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => Route$16
});
var RegisterRoute = Route$12.update({
	id: "/register",
	path: "/register",
	getParentRoute: () => Route$16
});
var ResetPasswordRoute = Route$11.update({
	id: "/reset-password",
	path: "/reset-password",
	getParentRoute: () => Route$16
});
var VerifyEmailRoute = Route$10.update({
	id: "/verify-email",
	path: "/verify-email",
	getParentRoute: () => Route$16
});
var AuthedIndexRoute = Route$9.update({
	id: "/",
	path: "/",
	getParentRoute: () => AuthedRoute
});
var AuthedAdminRoute = Route$8.update({
	id: "/admin",
	path: "/admin",
	getParentRoute: () => AuthedRoute
});
var AuthedNotificationsRoute = Route$7.update({
	id: "/notifications",
	path: "/notifications",
	getParentRoute: () => AuthedRoute
});
var AuthedSettingsRoute = Route$6.update({
	id: "/settings",
	path: "/settings",
	getParentRoute: () => AuthedRoute
});
var AuthedChannelsIndexRoute = Route$5.update({
	id: "/channels/",
	path: "/channels/",
	getParentRoute: () => AuthedRoute
});
var AuthedChannelsSlugRoute = Route$4.update({
	id: "/channels/$slug",
	path: "/channels/$slug",
	getParentRoute: () => AuthedRoute
});
var AuthedCommunitiesIndexRoute = Route$3.update({
	id: "/communities/",
	path: "/communities/",
	getParentRoute: () => AuthedRoute
});
var AuthedCommunitiesSlugRoute = Route$2.update({
	id: "/communities/$slug",
	path: "/communities/$slug",
	getParentRoute: () => AuthedRoute
});
var AuthedMessagesIndexRoute = Route$1.update({
	id: "/messages/",
	path: "/messages/",
	getParentRoute: () => AuthedRoute
});
var AuthedRouteChildren = {
	AuthedAdminRoute,
	AuthedNotificationsRoute,
	AuthedSettingsRoute,
	AuthedIndexRoute,
	AuthedChannelsSlugRoute,
	AuthedCommunitiesSlugRoute,
	AuthedMessagesSlugRoute: Route.update({
		id: "/messages/$slug",
		path: "/messages/$slug",
		getParentRoute: () => AuthedRoute
	}),
	AuthedChannelsIndexRoute,
	AuthedCommunitiesIndexRoute,
	AuthedMessagesIndexRoute
};
var rootRouteChildren = {
	AuthedRoute: AuthedRoute._addFileChildren(AuthedRouteChildren),
	ForgotPasswordRoute,
	LoginRoute,
	RegisterRoute,
	ResetPasswordRoute,
	VerifyEmailRoute
};
var routeTree = Route$16._addFileChildren(rootRouteChildren)._addFileTypes();
// src/lib/query-client.js
var createQueryClient = () => new QueryClient({ defaultOptions: { queries: {
	staleTime: 3e4,
	refetchOnWindowFocus: false
} } });
// src/router.jsx
var router_exports = /* @__PURE__ */ __exportAll({ getRouter: () => getRouter });
function getRouter() {
	const queryClient = createQueryClient();
	const router = createRouter({
		routeTree,
		context: { queryClient },
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
		defaultErrorComponent: DefaultCatchBoundary,
		defaultNotFoundComponent: () => /* @__PURE__ */ jsx(NotFound, {}),
		scrollRestoration: true
	});
	setupRouterSsrQueryIntegration({
		router,
		queryClient
	});
	return router;
}
export { Route$9 as a, useSite as c, getRouter, Route$4 as i, useAuth as l, Route as n, AuthGateError as o, Route$2 as r, AuthLayout as s, router_exports as t };
