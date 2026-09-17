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
    // SPA mode: nothing here renders on a server (Web Audio, Web MIDI, the
    // Firebase client SDK), so only the shell is prerendered. Server routes
    // and server functions stay available.
    tanstackStart({ spa: { enabled: true } }),
    viteReact(),
    tailwindcss(),
  ],
});
