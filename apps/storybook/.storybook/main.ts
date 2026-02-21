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
        alias: [
          {
            find: "@blibliki/ui/styles.css",
            replacement: resolve(uiPackagePath, "styles.css"),
          },
          {
            find: "@blibliki/ui/tokens.css",
            replacement: resolve(uiPackagePath, "tokens.css"),
          },
          {
            find: /^@blibliki\/ui$/,
            replacement: resolve(uiPackagePath, "src/index.ts"),
          },
          {
            find: /^@\//,
            replacement: `${resolve(uiPackagePath, "src")}/`,
          },
        ],
      },
    });
  },
};
export default config;
