import { deterministicId } from "@blibliki/utils";
import { ModuleType } from "@/modules";
import { Module } from "../module";
import { PolyModule } from "../module/PolyModule";
import { AudioInput, AudioOutput } from "./AudioIO";
import { MidiInput, MidiOutput } from "./MidiIO";
import { PolyAudioInput, PolyAudioOutput } from "./PolyAudioIO";

export type IOProps = {
  name: string;
  ioType: IOType;
};

export type IIOSerialize = IOProps & {
  id: string;
  moduleId: string;
};

export enum IOType {
  AudioInput = "audioInput",
  AudioOutput = "audioOutput",
  PolyAudioInput = "polyAudioInput",
  PolyAudioOutput = "polyAudioOutput",
  MidiOutput = "midiOutput",
  MidiInput = "midiInput",
}

export type IIO = {
  id: string;
  module: Module<ModuleType> | PolyModule<ModuleType>;
} & IOProps;

export abstract class Base implements IIO {
  id: string;
  ioType: IOType;
  name: string;
  module: Module<ModuleType> | PolyModule<ModuleType>;
  connections: Base[];

  constructor(
    module: Module<ModuleType> | PolyModule<ModuleType>,
    props: IOProps,
  ) {
    this.module = module;
    this.name = props.name;
    this.ioType = props.ioType;
    this.id = deterministicId(this.module.id, this.name);
    this.connections = [];
  }

  plug(io: Base, plugOther = true) {
    this.connections.push(io);
    if (plugOther) io.plug(this, false);
  }

  unPlug(io: Base, plugOther = true) {
    this.connections = this.connections.filter(
      (currentIO) => currentIO.id !== io.id,
    );
    if (plugOther) io.unPlug(this, false);
  }

  rePlugAll(callback?: () => void) {
    const connections = this.connections;
    this.unPlugAll();
    if (callback) callback();

    connections.forEach((otherIO) => {
      this.plug(otherIO);
    });
  }

  unPlugAll() {
    this.connections.forEach((otherIO) => {
      this.unPlug(otherIO);
    });
  }

  isAudio(): this is
    | AudioInput
    | AudioOutput
    | PolyAudioInput
    | PolyAudioOutput {
    return (
      this.ioType === IOType.AudioInput ||
      this.ioType === IOType.AudioOutput ||
      this.ioType === IOType.PolyAudioInput ||
      this.ioType === IOType.PolyAudioOutput
    );
  }

  isMidi(): this is MidiInput | MidiOutput {
    return (
      this.ioType === IOType.MidiInput || this.ioType === IOType.MidiOutput
    );
  }

  serialize(): IIOSerialize {
    return {
      id: this.id,
      name: this.name,
      ioType: this.ioType,
      moduleId: this.module.id,
    };
  }
}

export default abstract class IO<Connection extends Base> extends Base {
  declare connections: Connection[];

  plug(io: Connection, plugOther?: boolean): void {
    super.plug(io, plugOther);
  }

  unPlug(io: Connection, plugOther?: boolean): void {
    super.unPlug(io, plugOther);
  }
}
