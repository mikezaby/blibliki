import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import viteTsConfigPaths from "vite-tsconfig-paths";

const isVitest = process.env.VITEST === "true";

const config = defineConfig({
  resolve: {
    alias: [
      {
        find: /^@blibliki\/ui\/styles.css$/,
        replacement: new URL("../../packages/ui/styles.css", import.meta.url)
          .pathname,
      },
      {
        find: /^@blibliki\/ui$/,
        replacement: new URL("../../packages/ui/dist/index.js", import.meta.url)
          .pathname,
      },
      {
        find: /^@blibliki\/engine$/,
        replacement: new URL(
          "../../packages/engine/dist/index.js",
          import.meta.url,
        ).pathname,
      },
      {
        find: /^@blibliki\/instrument$/,
        replacement: new URL(
          "../../packages/instrument/dist/index.js",
          import.meta.url,
        ).pathname,
      },
      {
        find: /^@blibliki\/models$/,
        replacement: new URL(
          "../../packages/models/dist/index.js",
          import.meta.url,
        ).pathname,
      },
      {
        find: /^node-web-audio-api$/,
        replacement: new URL("./src/ssr/webAudioApiStub.ts", import.meta.url)
          .pathname,
      },
    ],
  },
  plugins: [
    !isVitest &&
      tanstackStart({
        spa: {
          enabled: true,
          maskPath: "/patch/new",
        },
      }),
    !isVitest && devtools(),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tailwindcss(),
    viteReact({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
});

export default config;
