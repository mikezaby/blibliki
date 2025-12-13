import { loadOrCreateConfig, getConfigPath } from "./config.js";

export { loadOrCreateConfig, getConfigPath };

/**
 * Main entry point for blibliki-pi
 */
export function main(): void {
  console.log("=== Blibliki Pi ===");

  const config = loadOrCreateConfig();

  console.log(`Config file location: ${getConfigPath()}`);
  console.log(`Token: ${config.token}`);
}

// If running as main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
