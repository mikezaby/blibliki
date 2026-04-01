import type {
  DisplayBandState,
  DisplayOscMessage,
  DisplayProtocolState,
  DisplayTargetClass,
} from "./index";
import {
  DEFAULT_DISPLAY_OSC_HOST,
  DEFAULT_DISPLAY_OSC_PORT,
  DEFAULT_PI_OSC_PORT,
} from "./network";

export type DebugBandMessage = Extract<
  DisplayOscMessage,
  { type: "display.band" }
>;

export type DebugFixtureNetworkConfig = {
  host: string;
  displayPort: number;
  piPort: number;
};

export function readDebugFixtureTargetClass(
  env: NodeJS.ProcessEnv = process.env,
): DisplayTargetClass {
  if (
    env.BLIBLIKI_DEBUG_TARGET_CLASS &&
    env.BLIBLIKI_DEBUG_TARGET_CLASS !== "standard" &&
    env.BLIBLIKI_DEBUG_TARGET_CLASS !== "compact-standard"
  ) {
    throw new Error(
      `Invalid BLIBLIKI_DEBUG_TARGET_CLASS value: ${env.BLIBLIKI_DEBUG_TARGET_CLASS}`,
    );
  }

  return env.BLIBLIKI_DEBUG_TARGET_CLASS === "compact-standard"
    ? "compact-standard"
    : "standard";
}

export function readDebugFixtureNetworkConfig(
  env: NodeJS.ProcessEnv = process.env,
): DebugFixtureNetworkConfig {
  return {
    host: env.BLIBLIKI_DEBUG_HOST ?? DEFAULT_DISPLAY_OSC_HOST,
    displayPort: Number.parseInt(
      env.BLIBLIKI_DEBUG_DISPLAY_PORT ?? `${DEFAULT_DISPLAY_OSC_PORT}`,
      10,
    ),
    piPort: Number.parseInt(
      env.BLIBLIKI_DEBUG_PI_PORT ?? `${DEFAULT_PI_OSC_PORT}`,
      10,
    ),
  };
}

export function createDebugFullState(
  revision = 1,
  targetClass: DisplayTargetClass = "standard",
): DisplayProtocolState {
  return {
    revision,
    screen: {
      orientation: "landscape",
      targetClass,
    },
    header: {
      left: "BLIBLIKI PI",
      center: "track-1",
      right: "Page 1: SOURCE / AMP",
      transport: "STOP",
      mode: "PERF",
    },
    bands: [
      {
        key: "global",
        title: "GLOBAL",
        cells: [
          {
            key: "tempo",
            label: "BPM",
            inactive: false,
            empty: false,
            value: {
              kind: "number",
              raw: 120,
              formatted: "120 BPM",
              visualNormalized: 0.5,
              visualScale: "linear",
            },
          },
          {
            key: "swing",
            label: "SWNG",
            inactive: false,
            empty: false,
            value: {
              kind: "number",
              raw: 54,
              formatted: "54%",
              visualNormalized: 0.54,
              visualScale: "linear",
            },
          },
        ],
      },
      {
        key: "upper",
        title: "SOURCE",
        cells: [
          {
            key: "source.wave",
            label: "WAVE",
            inactive: false,
            empty: false,
            value: {
              kind: "enum",
              raw: "saw",
              formatted: "saw",
              visualNormalized: 0.66,
              visualScale: "linear",
            },
          },
          {
            key: "source.detune",
            label: "DTUN",
            inactive: false,
            empty: false,
            value: {
              kind: "number",
              raw: 12,
              formatted: "12",
              visualNormalized: 0.12,
              visualScale: "linear",
            },
          },
        ],
      },
      {
        key: "lower",
        title: "AMP",
        cells: [
          {
            key: "amp.attack",
            label: "ATK",
            inactive: false,
            empty: false,
            value: {
              kind: "number",
              raw: 120,
              formatted: "120",
              visualNormalized: 0.5,
              visualScale: "linear",
            },
          },
          {
            key: "amp.release",
            label: "REL",
            inactive: false,
            empty: false,
            value: {
              kind: "number",
              raw: 800,
              formatted: "800",
              visualNormalized: 0.75,
              visualScale: "linear",
            },
          },
        ],
      },
    ],
  };
}

function createDebugGlobalBand(): DisplayBandState {
  return {
    key: "global",
    title: "GLOBAL",
    cells: [
      {
        key: "tempo",
        label: "BPM",
        inactive: false,
        empty: false,
        value: {
          kind: "number",
          raw: 137,
          formatted: "137 BPM",
          visualNormalized: 0.75,
          visualScale: "linear",
        },
      },
      {
        key: "swing",
        label: "SWNG",
        inactive: false,
        empty: false,
        value: {
          kind: "number",
          raw: 61,
          formatted: "61%",
          visualNormalized: 0.61,
          visualScale: "linear",
        },
      },
    ],
  };
}

export function createDebugBandMessage(revision = 2): DebugBandMessage {
  return {
    type: "display.band",
    revision,
    bandKey: "global",
    band: createDebugGlobalBand(),
  };
}
