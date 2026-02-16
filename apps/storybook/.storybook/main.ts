import type { StorybookConfig } from "@storybook/react-vite";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { mergeConfig } from "vite";

/**
 * This function is used to resolve the absolute path of a package.
 * It is needed in projects that use Yarn PnP or are set up within a monorepo.
 */
function getAbsolutePath(value: string) {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}

const uiPackagePath = resolve(import.meta.dirname, "../../../packages/ui");

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
  addons: [],
  framework: getAbsolutePath("@storybook/react-vite"),
  async viteFinal(baseConfig) {
    return mergeConfig(baseConfig, {
      resolve: {
        alias: {
          "@blibliki/ui": resolve(uiPackagePath, "src/index.ts"),
          "@blibliki/ui/styles.css": resolve(uiPackagePath, "styles.css"),
          "@blibliki/ui/tokens.css": resolve(uiPackagePath, "tokens.css"),
        },
      },
    });
  },
};
export default config;
