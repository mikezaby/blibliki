import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  // Same Firebase project as grid, and the same keys: reads are open by
  // design, and nothing can be written without a login this app does not have.
  // ponytail: reads grid's env file directly rather than duplicating six
  // secrets in a second gitignored file. Move both apps to a root .env with a
  // shared envDir if a third consumer needs them.
  envDir: fileURLToPath(new URL("../grid", import.meta.url)),
  plugins: [react(), tailwindcss()],
});
