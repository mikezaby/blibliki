import { defineConfig } from "tsup";
import baseConfig from "../../tsup.config";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "index.browser": "src/index.browser.ts",
    "index.node": "src/index.node.ts",
    "web-audio-api.browser": "src/web-audio-api.browser.ts",
    "web-audio-api.node": "src/web-audio-api.node.ts",
  },
  ...baseConfig,
});
