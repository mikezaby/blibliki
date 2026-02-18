import { UIProvider, themeToCssVariables, type UIMode } from "@blibliki/ui";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { getRouter } from "./router";
import "./styles/index.css";
import { gridUITheme } from "./theme/uiTheme";

const router = getRouter();
const getModeFromDocument = (): UIMode =>
  document.documentElement.classList.contains("dark") ? "dark" : "light";

function GridUIProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<UIMode>(() => getModeFromDocument());

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setMode(getModeFromDocument());
    });

    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    // Portaled UI (Dropdown/Dialog content) renders outside the provider subtree.
    // Apply variables at document root so all UI primitives share the same theme.
    const rootStyle = document.documentElement.style;
    const variables = themeToCssVariables(gridUITheme, mode);

    for (const [name, value] of Object.entries(variables)) {
      rootStyle.setProperty(name, value);
    }
  }, [mode]);

  return (
    <UIProvider mode={mode} theme={gridUITheme}>
      {children}
    </UIProvider>
  );
}

const rootElement = document.getElementById("root")!;
createRoot(rootElement).render(
  <StrictMode>
    <GridUIProvider>
      <RouterProvider router={router} />
    </GridUIProvider>
  </StrictMode>,
);
