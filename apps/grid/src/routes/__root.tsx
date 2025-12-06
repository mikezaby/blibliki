/// <reference types="vite/client" />
import { TanStackDevtools } from "@tanstack/react-devtools";
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import Providers from "@/Providers";
import { ColorSchemeBlockingScript } from "@/components/ColorSchemeBlockingScript";
import AudioModules from "@/components/layout/AudioModules";
import Header from "@/components/layout/Header";
import indexCss from "@/styles/index.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Blibliki Grid",
        description: "Modular synthesizer for web",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: indexCss,
      },
    ],
  }),
  shellComponent: RootComponent,
});

function RootComponent() {
  return (
    <Providers>
      <RootDocument>
        <Outlet />
      </RootDocument>
    </Providers>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <AudioModules />
        <Header />
        {children}
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

        <Scripts />
      </body>
    </html>
  );
}
