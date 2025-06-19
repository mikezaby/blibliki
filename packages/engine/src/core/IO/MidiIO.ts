import { ModuleType } from "@/modules";
import MidiEvent from "../midi/MidiEvent";
import { Module } from "../module";
import { PolyModule } from "../module/PolyModule";
import IO, { IOProps, IOType } from "./Base";

export type MidiIO = MidiInput | MidiOutput;

export interface MidiInputProps extends IOProps {
  ioType: IOType.MidiInput;
  onMidiEvent: (event: MidiEvent) => void;
}

export interface MidiOutputProps extends IOProps {
  ioType: IOType.MidiOutput;
}

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

export class MidiOutput extends IO<MidiInput> implements MidiOutputProps {
  declare ioType: IOType.MidiOutput;

  onMidiEvent = (event: MidiEvent) => {
    this.midiConnections.forEach((input) => {
      input.onMidiEvent(event);
    });
  };

  private get midiConnections() {
    return this.connections.filter((input) => input instanceof MidiInput);
  }
}
