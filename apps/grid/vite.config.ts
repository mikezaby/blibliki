import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 3000,
  },
  build: {
    target: "es2022",
  },
  esbuild: {
    target: "es2022",
  },
  plugins: [tsConfigPaths(), tanstackStart({ target: "netlify" })],
});
