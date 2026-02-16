import { defineConfig } from "eslint/config";
import baseConfig from "../../eslint.config.js";
import { createUIGovernanceConfig } from "./eslint/index.js";

export default defineConfig([baseConfig, createUIGovernanceConfig()]);
