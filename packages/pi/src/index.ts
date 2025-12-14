import { Engine } from "@blibliki/engine";
import { Device, initializeFirebase, Patch } from "@blibliki/models";
import {
  fetchFirebaseConfig,
  getDefaultGridUrl,
  areFirebaseConfigsEqual,
} from "./api.js";
import {
  loadOrCreateConfig,
  getConfigPath,
  updateConfig,
  getConfig,
} from "./config.js";
import { promptForUserId } from "./prompt.js";

export { loadOrCreateConfig, getConfigPath, updateConfig, getConfig };
export {
  fetchFirebaseConfig,
  getDefaultGridUrl,
  areFirebaseConfigsEqual,
} from "./api.js";
export { promptForUserId, confirmUserIdUpdate } from "./prompt.js";

/**
 * Check and update Firebase config if necessary
 * Returns true if config was updated, false otherwise
 */
async function checkAndUpdateFirebaseConfig(
  gridUrl?: string,
): Promise<boolean> {
  const currentConfig = loadOrCreateConfig();
  const urlToUse = gridUrl ?? getDefaultGridUrl();

  console.log(`\nChecking Firebase configuration from ${urlToUse}...`);

  try {
    const latestConfig = await fetchFirebaseConfig(gridUrl);

    // If no Firebase config exists, set it
    if (!currentConfig.firebase) {
      console.log("✓ Firebase configuration not found, setting it now...");
      updateConfig({ firebase: latestConfig });
      console.log(
        `✓ Firebase configuration saved (Project: ${latestConfig.projectId})`,
      );
      return true;
    }

    // If config exists, check if it's up-to-date
    if (!areFirebaseConfigsEqual(currentConfig.firebase, latestConfig)) {
      console.log("⚠ Firebase configuration is outdated, updating...");
      updateConfig({ firebase: latestConfig });
      console.log(
        `✓ Firebase configuration updated (Project: ${latestConfig.projectId})`,
      );
      return true;
    }

    console.log("✓ Firebase configuration is up-to-date");
    return false;
  } catch (error) {
    console.error("✗ Failed to check Firebase configuration:");
    console.error(
      error instanceof Error ? error.message : "Unknown error occurred",
    );
    console.error(`Make sure the Grid app is running at ${urlToUse}`);
    return false;
  }
}

/**
 * Check and setup userId if needed
 */
async function checkAndSetupUserId(): Promise<string> {
  const config = loadOrCreateConfig();

  if (!config.userId) {
    console.log("\n⚠ User ID not configured.");
    const userId = await promptForUserId();
    updateConfig({ userId });
    console.log(`\n✓ User ID saved: ${userId}`);
    return userId;
  }

  return config.userId;
}

/**
 * Main entry point for blibliki-pi
 */
export async function main(options?: { gridUrl?: string }): Promise<void> {
  console.log("=== Blibliki Pi ===");

  const config = loadOrCreateConfig();

  console.log(`\nConfig file location: ${getConfigPath()}`);
  console.log(`Token: ${config.token}`);

  // Check and setup userId (prompt if not set)
  const userId = await checkAndSetupUserId();
  console.log(`\nUser ID: ${userId}`);

  // Automatically check and update Firebase config on startup
  const configUpdated = await checkAndUpdateFirebaseConfig(options?.gridUrl);

  // Reload config if it was updated
  const finalConfig = configUpdated ? loadOrCreateConfig() : config;

  // Display Firebase status
  if (finalConfig.firebase) {
    console.log(`\nFirebase: Configured ✓`);
    console.log(`Project ID: ${finalConfig.firebase.projectId}`);
  } else {
    console.log("\nFirebase: Not configured");
    console.log(
      'Firebase config check failed. Ensure Grid app is running or use "blibliki-pi setup-firebase <grid-url>"',
    );
  }

  initializeFirebase(finalConfig.firebase!);

  const device = (
    await Device.findBy({
      userId: finalConfig.userId,
      token: finalConfig.token,
    })
  )[0];

  if (!device) {
    throw Error("Device: Not found");
  }

  if (!device.patchId) {
    throw Error("Device: patch not configured");
  }

  const patch = await Patch.find(device.patchId);

  const engine = await Engine.load(patch.engineSerialize());
  await engine.start();
}

/**
 * Setup Firebase configuration by fetching from Grid app
 */
export async function setupFirebase(gridUrl?: string): Promise<void> {
  const urlToUse = gridUrl ?? getDefaultGridUrl();
  console.log(`Fetching Firebase configuration from ${urlToUse}...`);

  try {
    const firebaseConfig = await fetchFirebaseConfig(gridUrl);
    updateConfig({ firebase: firebaseConfig });

    console.log("✓ Firebase configuration saved successfully!");
    console.log(`Project ID: ${firebaseConfig.projectId}`);
  } catch (error) {
    console.error("✗ Failed to setup Firebase:");
    console.error(
      error instanceof Error ? error.message : "Unknown error occurred",
    );
    throw error;
  }
}

// If running as main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);

  if (args[0] === "setup-firebase" && args[1]) {
    setupFirebase(args[1]).catch(console.error);
  } else {
    main().catch(console.error);
  }
}
