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

export { loadOrCreateConfig, getConfigPath, updateConfig, getConfig };
export {
  fetchFirebaseConfig,
  getDefaultGridUrl,
  areFirebaseConfigsEqual,
} from "./api.js";

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
 * Main entry point for blibliki-pi
 */
export async function main(options?: { gridUrl?: string }): Promise<void> {
  console.log("=== Blibliki Pi ===");

  const config = loadOrCreateConfig();

  console.log(`Config file location: ${getConfigPath()}`);
  console.log(`Token: ${config.token}`);

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

  // Check if device is registered
  if (finalConfig.deviceId) {
    console.log(`\nDevice ID: ${finalConfig.deviceId}`);

    if (finalConfig.patchId) {
      console.log(`Assigned Patch: ${finalConfig.patchId}`);
      console.log("\nReady to load and play patch!");
    } else {
      console.log("No patch assigned yet");
    }
  } else {
    console.log("\nDevice: Not registered");
    console.log("Use your token in Grid app to register this device");
  }
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
