import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  format: ["cjs", "esm"],
  target: "es2020",
  minify: true,
  platform: "neutral", // Ensure compatibility for both Node.js and browser
});
