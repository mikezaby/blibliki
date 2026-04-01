import {
  DEFAULT_DISPLAY_OSC_HOST,
  DEFAULT_DISPLAY_OSC_PORT,
  DEFAULT_PI_OSC_PORT,
} from "@blibliki/display-protocol";

export type DisplayAppConfig = {
  displayPort: number;
  piHost: string;
  piPort: number;
  debug: boolean;
};

function readPort(
  value: string | undefined,
  fallback: number,
  envName: string,
) {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${envName} value: ${value}`);
  }

  return parsed;
}

export function readDisplayAppConfig(
  env: NodeJS.ProcessEnv = process.env,
): DisplayAppConfig {
  return {
    displayPort: readPort(
      env.BLIBLIKI_DISPLAY_PORT,
      DEFAULT_DISPLAY_OSC_PORT,
      "BLIBLIKI_DISPLAY_PORT",
    ),
    piHost: env.BLIBLIKI_DISPLAY_PI_HOST ?? DEFAULT_DISPLAY_OSC_HOST,
    piPort: readPort(
      env.BLIBLIKI_DISPLAY_PI_PORT,
      DEFAULT_PI_OSC_PORT,
      "BLIBLIKI_DISPLAY_PI_PORT",
    ),
    debug: env.BLIBLIKI_DISPLAY_DEBUG === "1",
  };
}
