import { defineConfig } from "tsdown";
import baseConfig from "../../tsdown.config.ts";

export default defineConfig({
  // The root entry stays headless (pi-display consumes it from Node); only
  // ./react pulls in React and @blibliki/ui.
  entry: { index: "src/index.ts", react: "src/react/index.ts" },
  ...baseConfig,
});
