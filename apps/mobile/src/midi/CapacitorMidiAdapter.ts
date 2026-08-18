import type {
  IMidiAccess,
  IMidiAdapter,
  IMidiInputPort,
  IMidiOutputPort,
  IMidiPort,
  MidiMessageCallback,
} from "@blibliki/engine";
import { Capacitor, registerPlugin } from "@capacitor/core";

// Feeds the engine's MIDI seam from CoreMIDI through the native plugin in
// ios/App/App/BliblikiMidiPlugin.swift, because WebKit has no Web MIDI API.
type PortInfo = { id: string; name: string };

interface BliblikiMidiPlugin {
  listPorts(): Promise<{ inputs: PortInfo[]; outputs: PortInfo[] }>;
  send(options: { portId: string; data: number[] }): Promise<void>;
  addListener(
    eventName: "midiMessage",
    listener: (event: { portId: string; data: number[] }) => void,
  ): Promise<unknown>;
  addListener(
    eventName: "portsChanged",
    listener: () => void,
  ): Promise<unknown>;
}

const BliblikiMidi = registerPlugin<BliblikiMidiPlugin>("BliblikiMidi");

class CapacitorMidiInputPort implements IMidiInputPort {
  readonly type = "input" as const;
  name: string;
  state: "connected" | "disconnected" = "connected";
  private callbacks = new Set<MidiMessageCallback>();

  constructor(
    readonly id: string,
    name: string,
  ) {
    this.name = name;
  }

  addEventListener(callback: MidiMessageCallback): void {
    this.callbacks.add(callback);
  }

  removeEventListener(callback: MidiMessageCallback): void {
    this.callbacks.delete(callback);
  }

  dispatch(data: number[]): void {
    // ponytail: the bridge carries no usable clock, so messages are stamped on
    // arrival — same as NodeMidiAdapter. Costs the bridge hop in accuracy.
    const event = { data: new Uint8Array(data), timeStamp: performance.now() };
    this.callbacks.forEach((callback) => {
      callback(event);
    });
  }
}

class CapacitorMidiOutputPort implements IMidiOutputPort {
  readonly type = "output" as const;
  name: string;
  state: "connected" | "disconnected" = "connected";

  constructor(
    readonly id: string,
    name: string,
  ) {
    this.name = name;
  }

  send(data: number[] | Uint8Array): void {
    void BliblikiMidi.send({ portId: this.id, data: Array.from(data) });
  }
}

class CapacitorMidiAccess implements IMidiAccess {
  private inputPorts = new Map<string, CapacitorMidiInputPort>();
  private outputPorts = new Map<string, CapacitorMidiOutputPort>();
  private stateCallbacks = new Set<(port: IMidiPort) => void>();

  static async create(): Promise<CapacitorMidiAccess> {
    const access = new CapacitorMidiAccess();
    await access.refresh();

    await BliblikiMidi.addListener("midiMessage", ({ portId, data }) => {
      access.inputPorts.get(portId)?.dispatch(data);
    });
    await BliblikiMidi.addListener("portsChanged", () => {
      void access.refresh();
    });

    return access;
  }

  *inputs(): IterableIterator<IMidiInputPort> {
    for (const port of this.inputPorts.values()) {
      if (port.state === "connected") yield port;
    }
  }

  *outputs(): IterableIterator<IMidiOutputPort> {
    for (const port of this.outputPorts.values()) {
      if (port.state === "connected") yield port;
    }
  }

  addEventListener(
    _event: "statechange",
    callback: (port: IMidiPort) => void,
  ): void {
    this.stateCallbacks.add(callback);
  }

  private async refresh() {
    const { inputs, outputs } = await BliblikiMidi.listPorts();

    this.reconcile(
      this.inputPorts,
      inputs,
      (id, name) => new CapacitorMidiInputPort(id, name),
    );
    this.reconcile(
      this.outputPorts,
      outputs,
      (id, name) => new CapacitorMidiOutputPort(id, name),
    );
  }

  private reconcile<T extends CapacitorMidiInputPort | CapacitorMidiOutputPort>(
    ports: Map<string, T>,
    current: PortInfo[],
    create: (id: string, name: string) => T,
  ) {
    const currentIds = new Set(current.map((p) => p.id));

    for (const { id, name } of current) {
      const existing = ports.get(id);
      if (existing?.state === "connected") continue;

      const port = existing ?? create(id, name);
      port.name = name;
      port.state = "connected";
      ports.set(id, port);
      this.notify(port);
    }

    for (const port of ports.values()) {
      if (currentIds.has(port.id) || port.state === "disconnected") continue;

      port.state = "disconnected";
      this.notify(port);
    }
  }

  // The engine looks the port up again by id, so ports are kept after
  // disconnect rather than dropped.
  private notify(port: IMidiPort) {
    const snapshot = {
      id: port.id,
      name: port.name,
      state: port.state,
      type: port.type,
    };
    this.stateCallbacks.forEach((callback) => {
      callback(snapshot);
    });
  }
}

export default class CapacitorMidiAdapter implements IMidiAdapter {
  async requestMIDIAccess(): Promise<IMidiAccess | null> {
    if (!this.isSupported()) return null;

    try {
      return await CapacitorMidiAccess.create();
    } catch (err) {
      console.error("BliblikiMidi: could not open CoreMIDI:", err);
      return null;
    }
  }

  isSupported(): boolean {
    return Capacitor.isPluginAvailable("BliblikiMidi");
  }
}
