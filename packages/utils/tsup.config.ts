import { defineConfig } from "tsup";
import baseConfig from "../../tsup.config";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "web-audio-api": "src/web-audio-api.ts",
  },
  ...baseConfig,
});
