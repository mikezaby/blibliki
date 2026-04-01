import type { DisplayProtocolState } from "@blibliki/display-protocol";
import {
  createDefaultInstrumentDocument,
  createInstrumentEnginePatch,
} from "@blibliki/instrument";
import { describe, expect, it, vi } from "vitest";
import { createConfiguredDisplayOutput } from "@/displayOutput";
import {
  createInstrumentDisplayState,
  createInstrumentRuntimeState,
} from "@/instrumentRuntime";
import type { CreateOscDisplayPublisherOptions } from "@/oscDisplayPublisher";

function createSeededInstrumentDocument() {
  const document = createDefaultInstrumentDocument();
  const firstTrack = document.tracks[0];
  if (!firstTrack) {
    throw new Error("Expected default instrument to include a first track");
  }

  document.tracks[0] = {
    ...firstTrack,
    sourceProfileId: "osc",
  };

  return document;
}

function createFixtureDisplayState() {
  const runtimeState = createInstrumentRuntimeState(
    createInstrumentEnginePatch(createSeededInstrumentDocument()),
  );

  return createInstrumentDisplayState(runtimeState);
}

describe("createConfiguredDisplayOutput", () => {
  it("uses the terminal renderer by default", () => {
    const render = vi.fn();
    const dispose = vi.fn();
    const createTerminalDisplaySession = vi.fn(() => ({
      render,
      dispose,
    }));
    const output = createConfiguredDisplayOutput({
      env: {},
      createTerminalDisplaySession,
      createUdpOscDisplayTransport: vi.fn(),
      createOscDisplayPublisher: vi.fn(),
    });
    const displayState = createFixtureDisplayState();

    output.render(displayState);
    output.dispose();

    expect(createTerminalDisplaySession).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith(displayState);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("publishes protocol snapshots over osc when osc mode is enabled", () => {
    const publish = vi.fn();
    const disposePublisher = vi.fn();
    const transport = {
      send: vi.fn(),
      onMessage: vi.fn(() => () => undefined),
      close: vi.fn(),
    };
    const createTerminalDisplaySession = vi.fn();
    const createUdpOscDisplayTransport = vi.fn(() => transport);
    const createOscDisplayPublisher = vi.fn(() => ({
      publish,
      dispose: disposePublisher,
    }));
    const output = createConfiguredDisplayOutput({
      env: {
        BLIBLIKI_PI_DISPLAY_MODE: "osc",
        BLIBLIKI_PI_DISPLAY_HOST: "10.0.0.5",
        BLIBLIKI_PI_DISPLAY_PORT: "44000",
        BLIBLIKI_PI_CONTROL_PORT: "44001",
      },
      createTerminalDisplaySession,
      createUdpOscDisplayTransport,
      createOscDisplayPublisher,
    });
    const displayState = createFixtureDisplayState();

    output.render(displayState);
    output.render(displayState);
    output.dispose();

    expect(createTerminalDisplaySession).not.toHaveBeenCalled();
    expect(createUdpOscDisplayTransport).toHaveBeenCalledWith({
      controlPort: 44001,
    });
    expect(createOscDisplayPublisher).toHaveBeenCalledWith({
      transport,
      host: "10.0.0.5",
      displayPort: 44000,
      controlPort: 44001,
    });

    const firstState = publish.mock.calls[0]?.[0] as DisplayProtocolState;
    const secondState = publish.mock.calls[1]?.[0] as DisplayProtocolState;

    expect(firstState.revision).toBe(1);
    expect(secondState.revision).toBe(2);
    expect(disposePublisher).toHaveBeenCalledTimes(1);
  });

  it("passes a debug logger to the osc publisher when display debug is enabled", () => {
    const createOscDisplayPublisher = vi.fn(
      (_options: CreateOscDisplayPublisherOptions) => ({
        publish: vi.fn(),
        dispose: vi.fn(),
      }),
    );

    createConfiguredDisplayOutput({
      env: {
        BLIBLIKI_PI_DISPLAY_MODE: "osc",
        BLIBLIKI_PI_DISPLAY_DEBUG: "1",
      },
      createTerminalDisplaySession: vi.fn(),
      createUdpOscDisplayTransport: vi.fn(() => ({
        send: vi.fn(),
        onMessage: vi.fn(() => () => undefined),
        close: vi.fn(),
      })),
      createOscDisplayPublisher,
    });

    const publisherOptions = createOscDisplayPublisher.mock.calls[0]?.[0];

    expect(publisherOptions).toBeDefined();
    expect(typeof publisherOptions?.debugLog).toBe("function");
  });

  it("publishes the configured display target class for compact layouts", () => {
    const publish = vi.fn();
    const createOscDisplayPublisher = vi.fn(
      (_options: CreateOscDisplayPublisherOptions) => ({
        publish,
        dispose: vi.fn(),
      }),
    );
    const output = createConfiguredDisplayOutput({
      env: {
        BLIBLIKI_PI_DISPLAY_MODE: "osc",
        BLIBLIKI_PI_DISPLAY_TARGET_CLASS: "compact-standard",
      },
      createTerminalDisplaySession: vi.fn(),
      createUdpOscDisplayTransport: vi.fn(() => ({
        send: vi.fn(),
        onMessage: vi.fn(() => () => undefined),
        close: vi.fn(),
      })),
      createOscDisplayPublisher,
    });

    output.render(createFixtureDisplayState());

    const state = publish.mock.calls[0]?.[0] as DisplayProtocolState;

    expect(state.screen.targetClass).toBe("compact-standard");
  });
});
