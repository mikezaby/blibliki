import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";

const config = defineConfig({
  theme: {
    tokens: {
      fonts: {
        heading: { value: '"IBM Plex Sans", "Segoe UI", sans-serif' },
        body: { value: '"Inter", "Segoe UI", sans-serif' },
        mono: { value: '"IBM Plex Mono", "SFMono-Regular", monospace' },
      },
      colors: {
        brand: {
          50: { value: "#eef4ff" },
          100: { value: "#d9e5ff" },
          200: { value: "#b8ceff" },
          300: { value: "#93b4ff" },
          400: { value: "#6d97ff" },
          500: { value: "#4d78f4" },
          600: { value: "#3a5fd6" },
          700: { value: "#2e4bb0" },
          800: { value: "#283f8e" },
          900: { value: "#243570" },
        },
      },
    },
    semanticTokens: {
      colors: {
        appBg: {
          value: { _light: "{colors.gray.50}", _dark: "{colors.gray.950}" },
        },
        surfaceBg: {
          value: { _light: "{colors.white}", _dark: "{colors.gray.900}" },
        },
      },
    },
  },
});

export const gridSystem = createSystem(defaultConfig, config);
