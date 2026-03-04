import { Context } from "@blibliki/utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MidiDeviceManager from "@/core/midi/MidiDeviceManager";
import MidiInputDevice from "@/core/midi/MidiInputDevice";
import type {
  IMidiAccess,
  IMidiAdapter,
  IMidiInputPort,
  IMidiOutputPort,
  IMidiPort,
  MidiMessageCallback,
} from "@/core/midi/adapters";
import { LaunchControlXL3 } from "@/core/midi/controllers/LaunchControlXL3";

class FakeInputPort implements IMidiInputPort {
  private listeners = new Set<MidiMessageCallback>();
  private currentState: "connected" | "disconnected";

  readonly type = "input" as const;

  constructor(
    readonly id: string,
    readonly name: string,
    state: "connected" | "disconnected" = "connected",
  ) {
    this.currentState = state;
  }

  get state() {
    return this.currentState;
  }

  setState(state: "connected" | "disconnected") {
    this.currentState = state;
  }

  addEventListener(callback: MidiMessageCallback): void {
    this.listeners.add(callback);
  }

  removeEventListener(callback: MidiMessageCallback): void {
    this.listeners.delete(callback);
  }
}

class FakeOutputPort implements IMidiOutputPort {
  private currentState: "connected" | "disconnected";
  readonly send = vi.fn();

  readonly type = "output" as const;

  constructor(
    readonly id: string,
    readonly name: string,
    state: "connected" | "disconnected" = "connected",
  ) {
    this.currentState = state;
  }

  get state() {
    return this.currentState;
  }

  setState(state: "connected" | "disconnected") {
    this.currentState = state;
  }
}

class FakeMidiAccess implements IMidiAccess {
  private stateListeners = new Set<(port: IMidiPort) => void>();
  private inputPorts = new Map<string, FakeInputPort>();
  private outputPorts = new Map<string, FakeOutputPort>();

  constructor(inputs: FakeInputPort[], outputs: FakeOutputPort[]) {
    inputs.forEach((port) => this.inputPorts.set(port.id, port));
    outputs.forEach((port) => this.outputPorts.set(port.id, port));
  }

  *inputs(): IterableIterator<IMidiInputPort> {
    for (const [, input] of this.inputPorts) {
      yield input;
    }
  }

  *outputs(): IterableIterator<IMidiOutputPort> {
    for (const [, output] of this.outputPorts) {
      yield output;
    }
  }

  addEventListener(_event: "statechange", callback: (port: IMidiPort) => void) {
    this.stateListeners.add(callback);
  }

  removeEventListener(
    _event: "statechange",
    callback: (port: IMidiPort) => void,
  ) {
    this.stateListeners.delete(callback);
  }

  connectInput(port: FakeInputPort) {
    port.setState("connected");
    this.inputPorts.set(port.id, port);
    this.emitStateChange(port);
  }

  disconnectInput(id: string) {
    const port = this.inputPorts.get(id);
    if (!port) return;

    port.setState("disconnected");
    this.inputPorts.delete(id);
    this.emitStateChange(port);
  }

  connectOutput(port: FakeOutputPort) {
    port.setState("connected");
    this.outputPorts.set(port.id, port);
    this.emitStateChange(port);
  }

  disconnectOutput(id: string) {
    const port = this.outputPorts.get(id);
    if (!port) return;

    port.setState("disconnected");
    this.outputPorts.delete(id);
    this.emitStateChange(port);
  }

  private emitStateChange(port: IMidiPort) {
    this.stateListeners.forEach((listener) => listener(port));
  }
}

const createManager = (access: FakeMidiAccess) => {
  const manager = new MidiDeviceManager({} as Context, {
    onStart: vi.fn(),
    onStop: vi.fn(),
    isPlayingState: () => false,
  });

  const adapter: IMidiAdapter = {
    isSupported: () => true,
    requestMIDIAccess: vi.fn().mockResolvedValue(access),
  };

  (manager as unknown as { adapter: IMidiAdapter }).adapter = adapter;

  return manager;
};

describe("MidiDeviceManager", () => {
  beforeEach(() => {
    vi.spyOn(LaunchControlXL3.prototype, "animateColors").mockImplementation(
      () => {},
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("rebinds Launch Control DAW controller when DAW input is unplugged and replugged", async () => {
    const input1 = new FakeInputPort("input-1", "LCXL3 DAW In");
    const output = new FakeOutputPort("output-1", "LCXL3 DAW Out");
    const access = new FakeMidiAccess([input1], [output]);
    const manager = createManager(access);

    await manager.initialize();

    const firstInput = manager.findInput("input-1") as MidiInputDevice;
    expect(firstInput).toBeDefined();
    expect(firstInput.eventListerCallbacks).toHaveLength(1);

    access.disconnectInput("input-1");
    expect(firstInput.eventListerCallbacks).toHaveLength(0);

    const input2 = new FakeInputPort("input-2", "LCXL3 DAW In");
    access.connectInput(input2);

    const secondInput = manager.findInput("input-2") as MidiInputDevice;
    expect(secondInput).toBeDefined();
    expect(secondInput.eventListerCallbacks).toHaveLength(1);
  });

  it("disposes controller when DAW output disconnects and restores it when output reconnects", async () => {
    const input = new FakeInputPort("input-1", "LCXL3 DAW In");
    const output1 = new FakeOutputPort("output-1", "LCXL3 DAW Out");
    const access = new FakeMidiAccess([input], [output1]);
    const manager = createManager(access);

    await manager.initialize();

    const inputDevice = manager.findInput("input-1") as MidiInputDevice;
    expect(inputDevice.eventListerCallbacks).toHaveLength(1);

    access.disconnectOutput("output-1");
    expect(inputDevice.eventListerCallbacks).toHaveLength(0);

    const output2 = new FakeOutputPort("output-2", "LCXL3 DAW Out");
    access.connectOutput(output2);
    expect(inputDevice.eventListerCallbacks).toHaveLength(1);
  });

  it("cleans up controller input bindings when manager is disposed", async () => {
    const input = new FakeInputPort("input-1", "LCXL3 DAW In");
    const output = new FakeOutputPort("output-1", "LCXL3 DAW Out");
    const access = new FakeMidiAccess([input], [output]);
    const manager = createManager(access);

    await manager.initialize();

    const inputDevice = manager.findInput("input-1") as MidiInputDevice;
    expect(inputDevice.eventListerCallbacks).toHaveLength(1);

    (manager as any).dispose();
    expect(inputDevice.eventListerCallbacks).toHaveLength(0);
  });
});
