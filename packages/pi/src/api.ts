import { FirebaseConfig, IDevice } from "@blibliki/models";

/**
 * Get the default Grid URL based on environment
 * - Development: http://localhost:4000
 * - Production: https://blibliki.com
 */
export function getDefaultGridUrl(): string {
  // Check if we're in development mode
  // In bundled production code, process.env.NODE_ENV will be replaced by the bundler
  const isDevelopment =
    typeof process !== "undefined" &&
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    process.env?.NODE_ENV === "development";

  return isDevelopment ? "http://localhost:4000" : "https://blibliki.com";
}

/**
 * Compare two Firebase configurations for equality
 */
export function areFirebaseConfigsEqual(
  config1: FirebaseConfig,
  config2: FirebaseConfig,
): boolean {
  return (
    config1.apiKey === config2.apiKey &&
    config1.authDomain === config2.authDomain &&
    config1.projectId === config2.projectId &&
    config1.storageBucket === config2.storageBucket &&
    config1.messagingSenderId === config2.messagingSenderId &&
    config1.appId === config2.appId
  );
}

/**
 * Fetch Firebase configuration from Grid app
 */
export async function fetchFirebaseConfig(
  gridUrl?: string,
): Promise<FirebaseConfig> {
  const baseUrl = gridUrl ?? getDefaultGridUrl();
  const url = `${baseUrl}/api/firebase-config.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch Firebase config: ${response.status} ${response.statusText}`,
      );
    }

    const config = (await response.json()) as FirebaseConfig;
    return config;
  } catch (error) {
    console.error("Error fetching Firebase config:", error);
    throw error;
  }
}

/**
 * Find device by token (requires Firebase SDK initialized)
 */
export function findDeviceByToken(
  token: string,
  firestore: unknown,
): IDevice | null {
  // This will be implemented when Firebase SDK is integrated
  // For now, return a placeholder
  console.log("Finding device by token:", token);
  console.log("Firestore:", firestore);
  return null;
}

/**
 * Fetch patch by ID (requires Firebase SDK initialized)
 */
export function fetchPatch(patchId: string, firestore: unknown): unknown {
  // This will be implemented when Firebase SDK is integrated
  // For now, return a placeholder
  console.log("Fetching patch:", patchId);
  console.log("Firestore:", firestore);
  return null;
}
