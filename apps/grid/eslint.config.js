import { defineConfig } from "eslint/config";
import baseConfig from "../../eslint.config.js";

export default defineConfig([
  baseConfig,
  {
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
]);
