import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";

import { Provider } from "@/lib/components/ui/provider";
import ErrorPage from "@/lib/pages/error";
import Page404 from "@/lib/pages/not-found";
import { routeTree } from "@/routeTree.gen";

import "@fontsource-variable/plus-jakarta-sans/wght.css";

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  context: {
    queryClient,
  },
  defaultPreload: "intent",
  scrollRestoration: true,
  defaultStructuralSharing: true,
  defaultPreloadStaleTime: 0,
  defaultPendingComponent: () => (
    <div className="mx-auto">
      <p>Loading...</p>
    </div>
  ),
  defaultNotFoundComponent: () => <Page404 />,
  defaultErrorComponent: ({ error, reset }) => (
    <ErrorPage error={error} resetErrorBoundary={reset} />
  ),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("app");
if (rootElement && !rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <StrictMode>
      <Provider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </Provider>
    </StrictMode>,
  );
}
