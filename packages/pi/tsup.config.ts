import { defineConfig } from "tsup";
import baseConfig from "../../tsup.config";

export default defineConfig({
  entry: ["src/index.ts"],
  ...baseConfig,
  // Define NODE_ENV for production builds
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
