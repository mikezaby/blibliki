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
  type Config,
} from "./config.js";
import {
  startDeviceDeployment,
  type DeviceDeploymentDependencies,
} from "./deviceStartup.js";
import { createConfiguredDisplayOutput } from "./displayOutput.js";
import { loadInstrumentWorkingCopy } from "./instrumentPersistence.js";
import { promptForUserId } from "./prompt.js";

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
  createConfiguredDisplayOutput,
  type DisplayOutput,
} from "./displayOutput.js";
export {
  createInstrumentRuntimeState,
  createInstrumentDisplayState,
  navigateInstrumentRuntime,
  updateInstrumentRuntimeNavigation,
} from "./instrumentRuntime.js";
export { createLiveInstrumentDisplayState } from "./liveDisplayState.js";
export { createInstrumentControllerSession } from "./instrumentControllerSession.js";
export { instrumentDisplayStateToProtocol } from "./displayProtocol.js";
export { createOscDisplayPublisher } from "./oscDisplayPublisher.js";
export {
  createTerminalDisplaySession,
  renderInstrumentDisplayStateToTerminal,
} from "./terminalDisplay.js";
export { createUdpOscDisplayTransport } from "./udpOscTransport.js";
export { startDeviceDeployment } from "./deviceStartup.js";
export { reduceInstrumentControllerEvent } from "./controllerRuntime.js";
export type {
  InstrumentNavigationAction,
  InstrumentRuntimeState,
} from "./instrumentRuntime.js";
export type { LiveDisplayEngine } from "./liveDisplayState.js";
export type { InstrumentControllerSession } from "./instrumentControllerSession.js";
export type { InstrumentControllerResult } from "./controllerRuntime.js";
export type { OscDisplayPublisher } from "./oscDisplayPublisher.js";
export type {
  TerminalDisplaySession,
  TerminalDisplayWriter,
} from "./terminalDisplay.js";
export type { UdpOscDisplayTransport } from "./udpOscTransport.js";

export type StartConfiguredDeviceDependencies = Omit<
  DeviceDeploymentDependencies,
  "instrumentSessionOptions"
> & {
  startDeviceDeployment?: typeof startDeviceDeployment;
  createConfiguredDisplayOutput?: typeof createConfiguredDisplayOutput;
  instrumentSessionOptions?: DeviceDeploymentDependencies["instrumentSessionOptions"];
};

type ResolveConfiguredDeviceDependencies = {
  findDevices?: typeof Device.findBy;
  updateConfig?: typeof updateConfig;
  hasInstrumentWorkingCopy?: (instrumentId: string) => boolean;
};

export async function startConfiguredDevice(
  device: Device,
  dependencies: StartConfiguredDeviceDependencies = {},
) {
  const {
    startDeviceDeployment: startDeployment = startDeviceDeployment,
    createConfiguredDisplayOutput:
      createDisplayOutput = createConfiguredDisplayOutput,
    instrumentSessionOptions,
    ...deviceDeploymentDependencies
  } = dependencies;
  const deploymentTarget = normalizeDeviceDeploymentTarget(device);

  if (deploymentTarget?.kind !== "instrument") {
    return startDeployment(device, deviceDeploymentDependencies);
  }

  const displayOutput = createDisplayOutput();
  const onDisplayStateChange = instrumentSessionOptions?.onDisplayStateChange;

  try {
    return await startDeployment(device, {
      ...deviceDeploymentDependencies,
      instrumentSessionOptions: {
        ...instrumentSessionOptions,
        onDisplayStateChange: (displayState) => {
          displayOutput.render(displayState);
          onDisplayStateChange?.(displayState);
        },
      },
    });
  } catch (error) {
    displayOutput.dispose();
    throw error;
  }
}

function createCachedDevice(config: Config): Device | null {
  if (!config.userId) {
    return null;
  }

  const deploymentTarget =
    config.deploymentTarget ??
    (config.patchId
      ? {
          kind: "patch" as const,
          patchId: config.patchId,
        }
      : null);
  if (!deploymentTarget) {
    return null;
  }

  return new Device({
    id: config.deviceId,
    token: config.token,
    name: config.deviceName ?? "Cached Device",
    deploymentTarget,
    userId: config.userId,
  });
}

export async function resolveConfiguredDevice(
  config: Config,
  dependencies: ResolveConfiguredDeviceDependencies = {},
): Promise<Device> {
  const findDevices = (opts: Parameters<typeof Device.findBy>[0]) =>
    (dependencies.findDevices ?? Device.findBy)(opts);
  const hasInstrumentWorkingCopy =
    dependencies.hasInstrumentWorkingCopy ??
    ((instrumentId: string) =>
      loadInstrumentWorkingCopy(instrumentId) !== null);

  try {
    const device = (
      await findDevices({
        userId: config.userId,
        token: config.token,
      })
    )[0];

    if (!device) {
      throw new Error("Device: Not found");
    }

    dependencies.updateConfig?.({
      deviceId: device.id,
      deviceName: device.name,
      deploymentTarget: device.deploymentTarget,
      patchId: device.patchId ?? undefined,
    });

    return device;
  } catch (error) {
    const cachedDevice = createCachedDevice(config);
    const deploymentTarget = normalizeDeviceDeploymentTarget(
      cachedDevice ?? {},
    );

    if (
      cachedDevice &&
      deploymentTarget?.kind === "instrument" &&
      hasInstrumentWorkingCopy(deploymentTarget.instrumentId)
    ) {
      console.warn(
        `Falling back to cached instrument deployment ${deploymentTarget.instrumentId}`,
      );
      return cachedDevice;
    }

    throw error;
  }
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

  const device = await resolveConfiguredDevice(finalConfig, {
    updateConfig,
  });

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
