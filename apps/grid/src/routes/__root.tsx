/// <reference types="vite/client" />
import {
  ClientOnly,
  HeadContent,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { RouterErrorComponent } from "@/components/RouterErrorComponent";
import "@/styles/index.css";

const GridApp = lazy(() => import("@/GridApp.client"));

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
      },
      {
        name: "description",
        content: "Modular synthesizer for web",
      },
    ],
  }),
  shellComponent: RootDocument,
  component: RootComponent,
  errorComponent: RouterErrorComponent,
  ssr: false,
});

function RootComponent() {
  return (
    <ClientOnly fallback={null}>
      <Suspense fallback={null}>
        <GridApp />
      </Suspense>
    </ClientOnly>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
