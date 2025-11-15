import { assertNever } from "@blibliki/utils";
import { sortBy } from "es-toolkit";
import { ModuleType } from "@/modules";
import { Module } from "../module";
import { PolyModule } from "../module/PolyModule";
import {
  AudioInput,
  AudioInputProps,
  AudioOutput,
  AudioOutputProps,
} from "./AudioIO";
import { Base, IOType } from "./Base";
import {
  MidiInput,
  MidiInputProps,
  MidiOutput,
  MidiOutputProps,
} from "./MidiIO";
import {
  PolyAudioInput,
  PolyAudioInputProps,
  PolyAudioOutput,
  PolyAudioOutputProps,
} from "./PolyAudioIO";

export enum CollectionType {
  Input = "Input",
  Output = "Output",
}

type IMappedIOProps = {
  [CollectionType.Input]:
    | AudioInputProps
    | PolyAudioInputProps
    | MidiInputProps;
  [CollectionType.Output]:
    | AudioOutputProps
    | PolyAudioOutputProps
    | MidiOutputProps;
};

type IIOTypeTOClass = {
  [IOType.AudioInput]: AudioInput;
  [IOType.AudioOutput]: AudioOutput;
  [IOType.PolyAudioInput]: PolyAudioInput;
  [IOType.PolyAudioOutput]: PolyAudioOutput;
  [IOType.MidiInput]: MidiInput;
  [IOType.MidiOutput]: MidiOutput;
};

export default abstract class IOCollection<T extends CollectionType> {
  module: Module<ModuleType> | PolyModule<ModuleType>;
  collection: Base[] = [];
  collectionType: T;

  constructor(
    collectionType: T,
    module: Module<ModuleType> | PolyModule<ModuleType>,
  ) {
    this.collectionType = collectionType;
    this.module = module;
  }

  add<TT extends IMappedIOProps[T]>(props: TT): IIOTypeTOClass[TT["ioType"]] {
    let io:
      | AudioInput
      | AudioOutput
      | PolyAudioInput
      | PolyAudioOutput
      | MidiInput
      | MidiOutput;
    this.validateUniqName(props.name);

    switch (props.ioType) {
      case IOType.AudioInput:
        if (this.module instanceof PolyModule) throw Error("Not compatible");
        io = new AudioInput(this.module, props);
        break;
      case IOType.AudioOutput:
        if (this.module instanceof PolyModule) throw Error("Not compatible");
        io = new AudioOutput(this.module, props);
        break;
      case IOType.PolyAudioInput:
        if (this.module instanceof Module) throw Error("Not compatible");
        io = new PolyAudioInput(this.module, props);
        break;
      case IOType.PolyAudioOutput:
        if (this.module instanceof Module) throw Error("Not compatible");
        io = new PolyAudioOutput(this.module, props);
        break;
      case IOType.MidiInput:
        io = new MidiInput(this.module, props);
        break;
      case IOType.MidiOutput:
        io = new MidiOutput(this.module, props);
        break;
      default:
        assertNever(props);
    }

    this.collection.push(io);

    return io as IIOTypeTOClass[TT["ioType"]];
  }

  unPlugAll() {
    this.collection.forEach((io) => {
      io.unPlugAll();
    });
  }

  rePlugAll(callback?: () => void) {
    this.collection.forEach((io) => {
      io.rePlugAll(callback);
    });
  }

  find(id: string) {
    const io = this.collection.find((io) => io.id === id);
    if (!io) throw Error(`The io with id ${id} is not exists`);

    return io;
  }

  findByName(name: string) {
    const io = this.collection.find((io) => io.name === name);
    if (!io) throw Error(`The io with name ${name} is not exists`);

    return io;
  }

  serialize() {
    return sortBy(this.collection, [(io) => (io.isMidi() ? -1 : 1)]).map((io) =>
      io.serialize(),
    );
  }

  private validateUniqName(name: string) {
    if (this.collection.some((io) => io.name === name)) {
      throw Error(`An io with name ${name} is already exists`);
    }
  }
}

export class InputCollection extends IOCollection<CollectionType.Input> {
  constructor(module: Module<ModuleType> | PolyModule<ModuleType>) {
    super(CollectionType.Input, module);
  }
}

export class OutputCollection extends IOCollection<CollectionType.Output> {
  constructor(module: Module<ModuleType> | PolyModule<ModuleType>) {
    super(CollectionType.Output, module);
  }
}
