import { FirebaseConfig } from "@blibliki/models";
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface Config {
  token: string;
  userId?: string;
  firebase?: FirebaseConfig;
  deviceId?: string;
  patchId?: string;
}

const CONFIG_DIR = join(homedir(), ".config", "blibliki-pi");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

/**
 * Generate a cryptographically secure unique token
 * Uses 32 bytes (256 bits) of random data encoded as base64url
 */
function generateSecureToken(): string {
  // Generate 32 random bytes (256 bits)
  const buffer = randomBytes(32);

  // Convert to base64url (URL-safe base64 without padding)
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Ensure config directory exists
 */
function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load config from file, or return null if file doesn't exist
 */
function loadConfigFromFile(): Config | null {
  if (!existsSync(CONFIG_FILE)) {
    return null;
  }

  try {
    const content = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(content) as Config;
  } catch (error) {
    console.error("Error reading config file:", error);
    return null;
  }
}

/**
 * Save config to file
 */
function saveConfigToFile(config: Config): void {
  try {
    const content = JSON.stringify(config, null, 2);
    writeFileSync(CONFIG_FILE, content, "utf-8");
  } catch (error) {
    console.error("Error writing config file:", error);
    throw error;
  }
}

/**
 * Load or create config
 * - If config file exists and has a token, return it
 * - If config file exists but has no token, generate and save token
 * - If config file doesn't exist, create directory, generate token, and save
 */
export function loadOrCreateConfig(): Config {
  ensureConfigDir();

  let config = loadConfigFromFile();

  // If config doesn't exist, create new one with token
  if (!config) {
    console.log("No configuration found. Creating new config...");
    config = {
      token: generateSecureToken(),
    };
    saveConfigToFile(config);
    console.log(`Configuration created at: ${CONFIG_FILE}`);
    console.log(`Your token: ${config.token}`);
    return config;
  }

  // If config exists but has no token, generate and save it
  if (!config.token) {
    console.log("Token not found in config. Generating new token...");
    config.token = generateSecureToken();
    saveConfigToFile(config);
    console.log(`Token generated and saved.`);
    console.log(`Your token: ${config.token}`);
  }

  return config;
}

/**
 * Get the config file path (useful for debugging)
 */
export function getConfigPath(): string {
  return CONFIG_FILE;
}

/**
 * Update config with new values
 */
export function updateConfig(updates: Partial<Config>): Config {
  const config = loadOrCreateConfig();
  const updatedConfig = { ...config, ...updates };
  saveConfigToFile(updatedConfig);
  return updatedConfig;
}

/**
 * Get current config without creating if it doesn't exist
 */
export function getConfig(): Config | null {
  return loadConfigFromFile();
}
