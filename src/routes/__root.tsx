import { createRootRoute, HeadContent, Outlet } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

import { Layout } from "@/lib/layout";
import ErrorPage from "@/lib/pages/error";

const title = "Sudoku";
const description =
  "A browser-based Sudoku app with shareable puzzle URLs, multiple markup modes, and undo/redo history.";
const url = "https://jordan-white-dev.vercel.app/";

const AppDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@/lib/devtools/devtools").then((module) => ({
        default: module.AppDevtools,
      })),
    )
  : null;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      { name: "application-name", content: title },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: title },
      { name: "format-detection", content: "telephone=no" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "theme-color", content: "#000000" },
      { name: "og:type", content: "website" },
      { name: "og:url", content: url },
      { name: "og:title", content: title },
      { name: "og:description", content: description },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:url", content: url },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ],
    links: [{ rel: "icon", href: "/favicon.ico" }],
  }),
  component: () => (
    <>
      <HeadContent />
      <Layout>
        <ErrorBoundary FallbackComponent={ErrorPage}>
          <Outlet />
        </ErrorBoundary>
      </Layout>
      {AppDevtools ? (
        <Suspense fallback={null}>
          <AppDevtools />
        </Suspense>
      ) : null}
    </>
  ),
});
