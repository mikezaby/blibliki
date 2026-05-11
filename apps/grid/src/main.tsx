import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GridUIProvider } from "./GridUIProvider";
import { initialize } from "./globalSlice";
import { getRouter } from "./router";
import "./styles/index.css";
import { applyStoredAppearanceToRoot } from "./theme/bootstrapAppearance";

applyStoredAppearanceToRoot();
initialize();

const router = getRouter();

const rootElement = document.getElementById("root")!;
createRoot(rootElement).render(
  <StrictMode>
    <GridUIProvider>
      <RouterProvider router={router} />
    </GridUIProvider>
  </StrictMode>,
);
