import { createUIGovernanceConfig } from "@blibliki/ui/eslint";
import { defineConfig } from "eslint/config";
import baseConfig from "../../eslint.config.js";

export default defineConfig([
  baseConfig,
  createUIGovernanceConfig({ maxClasses: 12, severity: "error" }),
  {
    // A library entry, not an HMR app boundary.
    rules: { "react-refresh/only-export-components": "off" },
  },
]);
