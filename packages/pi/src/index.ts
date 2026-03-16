import { Context, Engine } from "@blibliki/engine";
import { compilePiPatcherDocument } from "@blibliki/pi-patcher";
import {
  Device,
  initializeFirebase,
  Patch,
  PiPatch,
} from "@blibliki/models";
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
import { PiSession } from "./runtime/PiSession.js";

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
    if (!device.piPatchId) {
      throw Error("Device: patch not configured");
    }
  }

  const engine = device.piPatchId
    ? await bootPiPatch(device.piPatchId)
    : await bootLegacyPatch(device.patchId!);
  await engine.start();
}

async function bootLegacyPatch(patchId: string) {
  const patch = await Patch.find(patchId);
  return Engine.load(patch.engineSerialize());
}

async function bootPiPatch(piPatchId: string) {
  const piPatch = await PiPatch.find(piPatchId);
  const compiled = compilePiPatcherDocument(piPatch.document);

  const engine = new Engine(new Context());
  const session = new PiSession(engine, compiled);

  await engine.initialize();
  engine.timeSignature = compiled.engine.timeSignature;
  engine.bpm = compiled.engine.bpm;

  compiled.engine.modules.forEach((module) => {
    engine.addModule(module as never);
  });
  compiled.engine.routes.forEach((route) => {
    engine.addRoute(route);
  });

  session.start();
  return engine;
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
