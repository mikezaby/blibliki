import { defineConfig } from "tsup";
import baseConfig from "../../tsup.config";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "index.browser": "src/index.browser.ts",
    "index.node": "src/index.node.ts",
    "Context.browser": "src/Context.browser.ts",
    "Context.node": "src/Context.node.ts",
    "web-audio-api.browser": "src/web-audio-api.browser.ts",
    "web-audio-api.node": "src/web-audio-api.node.ts",
  },
  ...baseConfig,
  // Mark node-web-audio-api as external so it's not bundled
  external: ["node-web-audio-api"],
});
