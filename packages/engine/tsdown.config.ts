import { defineConfig } from "tsdown";
import baseConfig from "../../tsdown.config.ts";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "index.browser": "src/index.browser.ts",
  },
  ...baseConfig,
});
