import { defineConfig } from "eslint/config";
import baseConfig from "../../eslint.config.js";

export default defineConfig([
  baseConfig,
  {
    // Route files export the Route object next to their component, which is
    // TanStack Router's file convention. Grid turns this off for the same reason.
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
]);
