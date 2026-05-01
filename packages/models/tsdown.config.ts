import { defineConfig } from "tsdown";
import baseConfig from "../../tsdown.config.ts";

export default defineConfig({
  entry: ["src/index.ts"],
  ...baseConfig,
});
