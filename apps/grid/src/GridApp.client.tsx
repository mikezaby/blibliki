import { TanStackDevtools } from "@tanstack/react-devtools";
import { Outlet, useLocation } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { GridUIProvider } from "@/GridUIProvider";
import Providers from "@/Providers";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NotificationContainer } from "@/components/Notification";
import Header from "@/components/layout/Header";
import { isInstrumentPerformanceRoutePath } from "@/routes/-instrumentRoutePath";

export default function GridApp() {
  const location = useLocation();
  const showHeader = !isInstrumentPerformanceRoutePath(location.pathname);

  return (
    <GridUIProvider>
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
    </GridUIProvider>
  );
}
