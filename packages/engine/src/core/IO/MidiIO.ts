import { ModuleType } from "@/modules";
import MidiEvent from "../midi/MidiEvent";
import { Module } from "../module";
import { PolyModule } from "../module/PolyModule";
import IO, { IOProps, IOType } from "./Base";

export type MidiIO = MidiInput | MidiOutput;

export type MidiInputProps = IOProps & {
  ioType: IOType.MidiInput;
  onMidiEvent: (event: MidiEvent) => void;
};

export type MidiOutputProps = IOProps & {
  ioType: IOType.MidiOutput;
};

export class MidiInput extends IO<MidiOutput> implements MidiInputProps {
  declare ioType: IOType.MidiInput;
  onMidiEvent: MidiInputProps["onMidiEvent"];

  constructor(
    module: Module<ModuleType> | PolyModule<ModuleType>,
    props: MidiInputProps,
  ) {
    super(module, props);
    this.onMidiEvent = props.onMidiEvent;
  }
}

export type MidiListener = (event: MidiEvent) => void;

export class MidiOutput extends IO<MidiInput> implements MidiOutputProps {
  declare ioType: IOType.MidiOutput;
  private listeners = new Set<MidiListener>();

  onMidiEvent = (event: MidiEvent) => {
    this.midiConnections.forEach((input) => {
      input.onMidiEvent(event);
    });
    this.listeners.forEach((listener) => {
      listener(event);
    });
  };

  // Observes events without a route, for hosts that mirror MIDI elsewhere
  // (the video engine's voice allocator). Returns the unsubscribe.
  listen(listener: MidiListener): () => void {
    this.listeners.add(listener);

    return () => this.listeners.delete(listener);
  }

  private get midiConnections() {
    return this.connections.filter((input) => input instanceof MidiInput);
  }
}
