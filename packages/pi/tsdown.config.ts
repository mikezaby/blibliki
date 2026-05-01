import { defineConfig } from "tsdown";
import baseConfig from "../../tsdown.config.ts";

export default defineConfig({
  entry: ["src/index.ts", "src/cli.ts"],
  ...baseConfig,
  platform: "node", // Override base config for Node.js CLI
  // Define NODE_ENV for production builds
  define: {
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
