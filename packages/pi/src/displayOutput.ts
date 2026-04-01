import {
  DEFAULT_DISPLAY_OSC_HOST,
  DEFAULT_DISPLAY_OSC_PORT,
  DEFAULT_PI_OSC_PORT,
  type DisplayTargetClass,
} from "@blibliki/display-protocol";
import type { InstrumentDisplayState } from "@blibliki/instrument";
import { instrumentDisplayStateToProtocol } from "@/displayProtocol";
import {
  createOscDisplayPublisher,
  type CreateOscDisplayPublisherOptions,
  type OscDisplayPublisher,
  type OscDisplayPublisherTransport,
} from "@/oscDisplayPublisher";
import {
  createTerminalDisplaySession,
  type TerminalDisplaySession,
} from "@/terminalDisplay";
import {
  createUdpOscDisplayTransport,
  type CreateUdpOscDisplayTransportOptions,
  type UdpOscDisplayTransport,
} from "@/udpOscTransport";

export type DisplayOutput = {
  render: (displayState: InstrumentDisplayState) => void;
  dispose: () => void;
};

export type CreateConfiguredDisplayOutputDependencies = {
  env?: NodeJS.ProcessEnv;
  createTerminalDisplaySession?: () => TerminalDisplaySession;
  createUdpOscDisplayTransport?: (
    options: CreateUdpOscDisplayTransportOptions,
  ) => UdpOscDisplayTransport;
  createOscDisplayPublisher?: (
    options: CreateOscDisplayPublisherOptions,
  ) => OscDisplayPublisher;
};

function readPort(
  value: string | undefined,
  fallback: number,
  envName: string,
) {
  if (!value) {
    return fallback;
  }

  const port = Number.parseInt(value, 10);
  if (!Number.isFinite(port) || port <= 0) {
    throw new Error(`Invalid ${envName} value: ${value}`);
  }

  return port;
}

function readTargetClass(value: string | undefined): DisplayTargetClass {
  if (!value || value === "standard") {
    return "standard";
  }

  if (value === "compact-standard") {
    return value;
  }

  throw new Error(`Invalid BLIBLIKI_PI_DISPLAY_TARGET_CLASS value: ${value}`);
}

function createOscDisplayOutput(
  env: NodeJS.ProcessEnv,
  dependencies: Required<
    Pick<
      CreateConfiguredDisplayOutputDependencies,
      "createUdpOscDisplayTransport" | "createOscDisplayPublisher"
    >
  >,
): DisplayOutput {
  const host = env.BLIBLIKI_PI_DISPLAY_HOST ?? DEFAULT_DISPLAY_OSC_HOST;
  const debugEnabled = env.BLIBLIKI_PI_DISPLAY_DEBUG === "1";
  const targetClass = readTargetClass(env.BLIBLIKI_PI_DISPLAY_TARGET_CLASS);
  const displayPort = readPort(
    env.BLIBLIKI_PI_DISPLAY_PORT,
    DEFAULT_DISPLAY_OSC_PORT,
    "BLIBLIKI_PI_DISPLAY_PORT",
  );
  const controlPort = readPort(
    env.BLIBLIKI_PI_CONTROL_PORT,
    DEFAULT_PI_OSC_PORT,
    "BLIBLIKI_PI_CONTROL_PORT",
  );
  const transport = dependencies.createUdpOscDisplayTransport({
    controlPort,
  }) as OscDisplayPublisherTransport;
  const publisher = dependencies.createOscDisplayPublisher({
    transport,
    host,
    displayPort,
    controlPort,
    debugLog: debugEnabled
      ? (message) => {
          console.log(`[blibliki-pi-display] ${message}`);
        }
      : undefined,
  });
  let revision = 0;

  return {
    render(displayState) {
      revision += 1;
      publisher.publish(
        instrumentDisplayStateToProtocol(displayState, revision, targetClass),
      );
    },
    dispose() {
      publisher.dispose();
    },
  };
}

export function createConfiguredDisplayOutput(
  dependencies: CreateConfiguredDisplayOutputDependencies = {},
): DisplayOutput {
  const env = dependencies.env ?? process.env;

  if (env.BLIBLIKI_PI_DISPLAY_MODE === "osc") {
    return createOscDisplayOutput(env, {
      createUdpOscDisplayTransport:
        dependencies.createUdpOscDisplayTransport ??
        createUdpOscDisplayTransport,
      createOscDisplayPublisher:
        dependencies.createOscDisplayPublisher ?? createOscDisplayPublisher,
    });
  }

  const terminalDisplay =
    dependencies.createTerminalDisplaySession?.() ??
    createTerminalDisplaySession();

  return {
    render(displayState) {
      terminalDisplay.render(displayState);
    },
    dispose() {
      terminalDisplay.dispose();
    },
  };
}
