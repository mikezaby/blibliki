import { StartClient } from "@tanstack/react-start/client";
import { StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { initialize } from "./globalSlice";
import { applyStoredAppearanceToRoot } from "./theme/bootstrapAppearance";

applyStoredAppearanceToRoot();
initialize();

hydrateRoot(
  document,
  <StrictMode>
    <StartClient />
  </StrictMode>,
);
