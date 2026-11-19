import { HeadContent, Outlet, Scripts, createRootRoute } from "@tanstack/react-router";
import { DefaultCatchBoundary } from "@/components/DefaultCatchBoundary";
import { NotFound } from "@/components/NotFound";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/AuthContext";
import { LangProvider, tStatic } from "@/lib/i18n";
import { SiteProvider } from "@/lib/SiteContext";
import appCss from "@/index.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: tStatic("titles.root") },
      { name: "description", content: tStatic("meta.description") },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Space+Grotesk:wght@400;500;600;700&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
  component: RootComponent,
});

function RootComponent() {
  return (
    <AuthProvider>
      <SiteProvider>
        <Outlet />
        <Toaster />
      </SiteProvider>
    </AuthProvider>
  );
}

function RootDocument({ children }) {
  return (
    <html lang="tr" className="dark">
      <head>
        <HeadContent />
      </head>
      <body data-react-root="true">
        <LangProvider>
          {children}
          <Scripts />
        </LangProvider>
      </body>
    </html>
  );
}
