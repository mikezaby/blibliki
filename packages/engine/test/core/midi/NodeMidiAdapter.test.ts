import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NodeMidiAdapter from "@/core/midi/adapters/NodeMidiAdapter";
import type { IMidiPort } from "@/core/midi/adapters/types";

let inputPortNames: string[] = [];
let outputPortNames: string[] = [];
const HOT_PLUG_POLL_INTERVAL_MS = 1000;
let inputInstances: MockInput[] = [];
let outputInstances: MockOutput[] = [];

class MockInput {
  private open = false;
  destroyed = false;

  constructor() {
    inputInstances.push(this);
  }

  getPortCount(): number {
    return inputPortNames.length;
  }

  getPortName(port: number): string {
    return inputPortNames[port] ?? "";
  }

  openPort(): void {
    this.open = true;
  }

  closePort(): void {
    this.open = false;
  }

  destroy(): void {
    this.open = false;
    this.destroyed = true;
  }

  on(): void {}

  off(): void {}

  isPortOpen(): boolean {
    return this.open;
  }
}

class MockOutput {
  private open = false;
  destroyed = false;

  constructor() {
    outputInstances.push(this);
  }

  getPortCount(): number {
    return outputPortNames.length;
  }

  getPortName(port: number): string {
    return outputPortNames[port] ?? "";
  }

  openPort(): void {
    this.open = true;
  }

  closePort(): void {
    this.open = false;
  }

  destroy(): void {
    this.open = false;
    this.destroyed = true;
  }

  sendMessage(): void {}

  isPortOpen(): boolean {
    return this.open;
  }
}

vi.mock("@julusian/midi", () => ({
  Input: MockInput,
  Output: MockOutput,
}));

describe("NodeMidiAdapter hot-plug polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    inputPortNames = ["Komplete Kontrol"];
    outputPortNames = ["LoopMIDI"];
    inputInstances = [];
    outputInstances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const advancePoll = async () => {
    await vi.advanceTimersByTimeAsync(HOT_PLUG_POLL_INTERVAL_MS + 1);
  };

  it("emits statechange when a new input port is added", async () => {
    const adapter = new NodeMidiAdapter();
    const access = await adapter.requestMIDIAccess();
    expect(access).not.toBeNull();
    const events: IMidiPort[] = [];
    access!.addEventListener("statechange", (eventPort) => {
      events.push(eventPort);
    });

    inputPortNames = ["Komplete Kontrol", "New Device"];
    await advancePoll();

    expect(events).toHaveLength(1);
    expect(events[0]?.name).toBe("New Device");
    expect(events[0]?.id).toBe("New Device:1");
    expect(events[0]?.type).toBe("input");
    expect(events[0]?.state).toBe("connected");
  });

  it("emits statechange when an output port is removed", async () => {
    outputPortNames = ["LoopMIDI", "Launchpad"];

    const adapter = new NodeMidiAdapter();
    const access = await adapter.requestMIDIAccess();
    expect(access).not.toBeNull();

    const events: IMidiPort[] = [];
    access!.addEventListener("statechange", (port) => {
      events.push(port);
    });

    outputPortNames = ["LoopMIDI"]; // remove the last port to avoid index churn
    await advancePoll();

    expect(events).toHaveLength(1);
    expect(events[0]?.name).toBe("Launchpad");
    expect(events[0]?.id).toBe("Launchpad:1");
    expect(events[0]?.type).toBe("output");
    expect(events[0]?.state).toBe("disconnected");
  });

  it("keeps the same input port instance and reconnects it on replug", async () => {
    const adapter = new NodeMidiAdapter();
    const access = await adapter.requestMIDIAccess();
    expect(access).not.toBeNull();
    const events: IMidiPort[] = [];
    access!.addEventListener("statechange", (eventPort) => {
      events.push(eventPort);
    });

    const ports = Array.from(access!.inputs());
    expect(ports).toHaveLength(1);
    const port = ports[0]!;

    port.addEventListener(() => {});

    inputPortNames = [];
    await advancePoll();
    const disconnectEvent = events.find(
      (event) => event.state === "disconnected",
    );
    expect(disconnectEvent).toBe(port);

    inputPortNames = ["Komplete Kontrol"];
    await advancePoll();

    const portsAfter = Array.from(access!.inputs());
    expect(portsAfter).toHaveLength(1);
    expect(portsAfter[0]).toBe(port);
    const reconnectEvent = events.filter(
      (event) => event.state === "connected",
    );
    expect(reconnectEvent[reconnectEvent.length - 1]).toBe(port);
  });

  it("destroys temporary scan clients after the initial scan and each poll", async () => {
    const adapter = new NodeMidiAdapter();
    const access = await adapter.requestMIDIAccess();
    expect(access).not.toBeNull();

    access!.addEventListener("statechange", () => {});
    await advancePoll();

    expect(inputInstances).toHaveLength(3);
    expect(outputInstances).toHaveLength(3);
    expect(
      inputInstances.filter((instance) => instance.destroyed),
    ).toHaveLength(2);
    expect(
      outputInstances.filter((instance) => instance.destroyed),
    ).toHaveLength(2);
    expect(
      inputInstances.filter((instance) => !instance.destroyed),
    ).toHaveLength(1);
    expect(
      outputInstances.filter((instance) => !instance.destroyed),
    ).toHaveLength(1);
  });
});
