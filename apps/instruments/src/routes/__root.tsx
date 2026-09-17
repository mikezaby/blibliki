import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import type { ReactNode } from "react";
import { initializeFirebaseOnce } from "../firebase";
import styles from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: "Blibliki Instruments" },
    ],
    links: [{ rel: "stylesheet", href: styles }],
  }),
  // Instruments are read from Firestore, so this has to happen before any
  // route asks for one. The shell is prerendered at build time, where there
  // is no window and no reason to initialize.
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      initializeFirebaseOnce();
    }
  },
  component: RootComponent,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className="dark" data-theme="dark">
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
