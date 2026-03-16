import { defineConfig } from "tsup";
import baseConfig from "../../tsup.config";

export default defineConfig({
  entry: ["src/index.ts"],
  ...baseConfig,
});
