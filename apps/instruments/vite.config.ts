import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  // The server bundle only prerenders the shell, but it still resolves the
  // workspace packages, and @blibliki/utils' `node` export pulls in
  // node-web-audio-api's native binary. Resolve it as a browser instead.
  ssr: {
    resolve: {
      conditions: ["browser", "import", "module", "default"],
    },
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    // SPA mode: nothing here renders on a server (Web Audio, Web MIDI, the
    // Firebase client SDK), so only the shell is prerendered. Server routes
    // and server functions stay available. The shell is named index.html so
    // Cloudflare's single-page-application fallback can serve it as a static
    // asset for every path wrangler.jsonc does not send to the Worker.
    tanstackStart({
      spa: { enabled: true, prerender: { outputPath: "/index.html" } },
    }),
    viteReact(),
    tailwindcss(),
  ],
});
