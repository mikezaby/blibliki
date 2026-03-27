import {
  Device,
  initializeFirebase,
  normalizeDeviceDeploymentTarget,
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
import {
  startDeviceDeployment,
  type DeviceDeploymentDependencies,
} from "./deviceStartup.js";
import { promptForUserId } from "./prompt.js";
import { createTerminalDisplaySession } from "./terminalDisplay.js";

export { loadOrCreateConfig, getConfigPath, updateConfig, getConfig };
export {
  fetchFirebaseConfig,
  getDefaultGridUrl,
  areFirebaseConfigsEqual,
} from "./api.js";
export { promptForUserId, confirmUserIdUpdate } from "./prompt.js";
export {
  createInstrumentSession,
  startInstrumentSession,
  type InstrumentSession,
  type StartedInstrumentSession,
  type InstrumentSessionOptions,
  type StartInstrumentSessionOptions,
} from "./instrumentSession.js";
export {
  createDefaultInstrumentSession,
  startDefaultInstrument,
} from "./defaultInstrument.js";
export {
  createInstrumentRuntimeState,
  createInstrumentDisplayState,
  navigateInstrumentRuntime,
  updateInstrumentRuntimeNavigation,
} from "./instrumentRuntime.js";
export { createLiveInstrumentDisplayState } from "./liveDisplayState.js";
export { createInstrumentControllerSession } from "./instrumentControllerSession.js";
export {
  createTerminalDisplaySession,
  renderInstrumentDisplayStateToTerminal,
} from "./terminalDisplay.js";
export { startDeviceDeployment } from "./deviceStartup.js";
export { reduceInstrumentControllerEvent } from "./controllerRuntime.js";
export type {
  InstrumentNavigationAction,
  InstrumentRuntimeState,
} from "./instrumentRuntime.js";
export type { LiveDisplayEngine } from "./liveDisplayState.js";
export type { InstrumentControllerSession } from "./instrumentControllerSession.js";
export type { InstrumentControllerResult } from "./controllerRuntime.js";
export type {
  TerminalDisplaySession,
  TerminalDisplayWriter,
} from "./terminalDisplay.js";

export type StartConfiguredDeviceDependencies = Omit<
  DeviceDeploymentDependencies,
  "instrumentSessionOptions"
> & {
  startDeviceDeployment?: typeof startDeviceDeployment;
  createTerminalDisplaySession?: typeof createTerminalDisplaySession;
  instrumentSessionOptions?: DeviceDeploymentDependencies["instrumentSessionOptions"];
};

export async function startConfiguredDevice(
  device: Device,
  dependencies: StartConfiguredDeviceDependencies = {},
) {
  const {
    startDeviceDeployment: startDeployment = startDeviceDeployment,
    createTerminalDisplaySession:
      createDisplaySession = createTerminalDisplaySession,
    instrumentSessionOptions,
    ...deviceDeploymentDependencies
  } = dependencies;
  const deploymentTarget = normalizeDeviceDeploymentTarget(device);

  if (deploymentTarget?.kind !== "instrument") {
    return startDeployment(device, deviceDeploymentDependencies);
  }

  const terminalDisplay = createDisplaySession();
  const onDisplayStateChange = instrumentSessionOptions?.onDisplayStateChange;

  return startDeployment(device, {
    ...deviceDeploymentDependencies,
    instrumentSessionOptions: {
      ...instrumentSessionOptions,
      onDisplayStateChange: (displayState) => {
        terminalDisplay.render(displayState);
        onDisplayStateChange?.(displayState);
      },
    },
  });
}

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

  await startConfiguredDevice(device);
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
