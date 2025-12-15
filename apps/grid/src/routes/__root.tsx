/// <reference types="vite/client" />
import { TanStackDevtools } from "@tanstack/react-devtools";
import { Outlet, createRootRoute } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import Providers from "@/Providers";
import { ColorSchemeBlockingScript } from "@/components/ColorSchemeBlockingScript";
import { NotificationContainer } from "@/components/Notification";
import Header from "@/components/layout/Header";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <Providers>
      <Header />
      <Outlet />
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
