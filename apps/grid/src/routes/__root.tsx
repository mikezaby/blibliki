/// <reference types="vite/client" />
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import Providers from "@/Providers";
import { ColorSchemeBlockingScript } from "@/components/ColorSchemeBlockingScript";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationContainer } from "@/components/Notification";
import { RouterErrorComponent } from "@/components/RouterErrorComponent";
import Header from "@/components/layout/Header";
import { initialize } from "@/globalSlice";

export const Route = createRootRoute({
  beforeLoad: () => {
    initialize();
  },
  component: RootComponent,
  errorComponent: RouterErrorComponent,
});

function RootComponent() {
  return (
    <Providers>
      <Header />
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
      <NotificationContainer />
      <ColorSchemeBlockingScript />

      <TanStackDevtools
        config={{
          position: "bottom-right",
        }}
        plugins={[
          {
            name: "Tanstack Router",
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </Providers>
  );
}
