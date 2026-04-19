/// <reference types="vite/client" />
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Outlet, createRootRoute, useLocation } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import Providers from "@/Providers";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationContainer } from "@/components/Notification";
import { RouterErrorComponent } from "@/components/RouterErrorComponent";
import Header from "@/components/layout/Header";
import { initialize } from "@/globalSlice";
import { isInstrumentPerformanceRoutePath } from "./-instrumentRoutePath";

export const Route = createRootRoute({
  beforeLoad: () => {
    initialize();
  },
  component: RootComponent,
  errorComponent: RouterErrorComponent,
});

function RootComponent() {
  const location = useLocation();
  const showHeader = !isInstrumentPerformanceRoutePath(location.pathname);

  return (
    <Providers>
      {showHeader ? <Header /> : null}
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
      <NotificationContainer />

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
