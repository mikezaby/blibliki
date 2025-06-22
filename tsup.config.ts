import { defineConfig } from "tsup";

export default defineConfig({
  splitting: false,
  sourcemap: true,
  clean: true,
  dts: true,
  format: ["cjs", "esm"],
  target: "es2022",
  minify: true,
  platform: "neutral", // Ensure compatibility for both Node.js and browser
});
