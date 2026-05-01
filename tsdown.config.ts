import type { UserConfig } from "tsdown";

const config = {
  sourcemap: true,
  clean: true,
  dts: true,
  format: ["esm"],
  target: "es2022",
  fixedExtension: false,
  deps: {
    neverBundle: [/^node:/],
  },
  minify: true,
  platform: "neutral", // Ensure compatibility for both Node.js and browser
} satisfies UserConfig;

export default config;
