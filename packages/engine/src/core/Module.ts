import { Optional, upperFirst, uuidv4 } from "@blibliki/utils";
import { Engine } from "@/Engine";
import { AnyModule, ModuleType, ModuleTypeToPropsMapping } from "@/modules";
import { IAnyAudioContext } from ".";
import {
  AudioInputProps,
  AudioOutputProps,
  IIOSerialize,
  IOType,
  InputCollection,
  OutputCollection,
  MidiInputProps,
  MidiOutputProps,
} from "./IO";
import Note from "./Note";
import { t, TTime } from "./Timing/Time";
import MidiEvent, { MidiEventType } from "./midi/MidiEvent";

export interface IModule<T extends ModuleType> {
  id: string;
  name: string;
  moduleType: T;
  props: ModuleTypeToPropsMapping[T];
}

export interface IModuleSerialize<T extends ModuleType> extends IModule<T> {
  inputs: IIOSerialize[];
  outputs: IIOSerialize[];
}

export interface Startable {
  start(time: TTime): void;
  stop(time: TTime): void;
}

export function isStartable<T>(value: T): value is T & Startable {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as unknown as Startable).start === "function" &&
    typeof (value as unknown as Startable).stop === "function"
  );
}

interface IModuleConstructor<T extends ModuleType>
  extends Optional<IModule<T>, "id"> {
  audioNodeConstructor?: (context: IAnyAudioContext) => AudioNode;
}

export default abstract class Module<T extends ModuleType>
  implements IModule<T>
{
  id: string;
  engineId: string;
  name: string;
  moduleType: T;
  audioNode: AudioNode | undefined;
  inputs: InputCollection;
  outputs: OutputCollection;
  protected _props!: ModuleTypeToPropsMapping[T];
  protected superInitialized: boolean = false;

  constructor(engineId: string, params: IModuleConstructor<T>) {
    const { id, name, moduleType, audioNodeConstructor, props } = params;

    this.id = id || uuidv4();
    this.engineId = engineId;
    this.name = name;
    this.moduleType = moduleType;
    this.audioNode = audioNodeConstructor?.(this.context);
    this._props = {} as ModuleTypeToPropsMapping[T];
    this.props = props;

    this.inputs = new InputCollection(this);
    this.outputs = new OutputCollection(this);

    this.superInitialized = true;
  }

  get props(): ModuleTypeToPropsMapping[T] {
    return this._props;
  }

  set props(value: Partial<ModuleTypeToPropsMapping[T]>) {
    Object.keys(value).forEach((key) => {
      const onSetAttr = `onSet${upperFirst(key)}`;

      // @ts-expect-error TS7053 ignore this error
      // eslint-disable-next-line
      this[onSetAttr]?.(value[key]);
    });

    this._props = { ...this._props, ...value };

    Object.keys(value).forEach((key) => {
      const onSetAttr = `onAfterSet${upperFirst(key)}`;

      // @ts-expect-error TS7053 ignore this error
      // eslint-disable-next-line
      this[onSetAttr]?.(value[key]);
    });
  }

  serialize(): IModuleSerialize<T> {
    return {
      id: this.id,
      name: this.name,
      moduleType: this.moduleType,
      props: this.props,
      inputs: this.inputs.serialize(),
      outputs: this.outputs.serialize(),
    };
  }

  plug({
    audioModule,
    from,
    to,
  }: {
    audioModule: AnyModule;
    from: string;
    to: string;
  }) {
    const output = this.outputs.findByName(from);
    const input = audioModule.inputs.findByName(to);

    output.plug(input);
  }

  protected rePlugAll(callback?: () => void) {
    this.inputs.rePlugAll(callback);
    this.outputs.rePlugAll(callback);
  }

  protected unPlugAll() {
    this.inputs.unPlugAll();
    this.outputs.unPlugAll();
  }

  triggerAttack = (_note: Note, _triggeredAt: TTime): void => {
    throw Error("triggerAttack not implemented");
  };

  triggerRelease = (_note: Note, _triggeredAt: TTime): void => {
    throw Error("triggerRelease not implemented");
  };

  onMidiEvent = (midiEvent: MidiEvent) => {
    const { note, triggeredAt } = midiEvent;

    switch (midiEvent.type) {
      case MidiEventType.noteOn: {
        this.triggerer(this.triggerAttack, note, triggeredAt);
        break;
      }
      case MidiEventType.noteOff:
        this.triggerer(this.triggerRelease, note, triggeredAt);
        break;
      default:
        throw Error("This type is not a note");
    }
  };

  protected triggerPropsUpdate() {
    this.engine._triggerPropsUpdate({
      id: this.id,
      moduleType: this.moduleType,
      name: this.name,
      props: this.props,
    });
  }

  dispose() {
    this.inputs.unPlugAll();
    this.outputs.unPlugAll();
  }

  private triggerer(
    trigger: (note: Note, triggeredAt: TTime) => void,
    note: Note | undefined,
    triggeredAt: TTime,
  ) {
    if (!note) return;

    trigger(note, t(triggeredAt));
  }

  protected registerDefaultIOs(value: "both" | "in" | "out" = "both") {
    this.registerMidiInput({
      name: "midi in",
      onMidiEvent: this.onMidiEvent,
    });

    if (!this.audioNode) return;

    if (value === "in" || value === "both") {
      this.registerAudioInput({
        name: "in",
        getAudioNode: () => this.audioNode!,
      });
    }

    if (value === "out" || value === "both") {
      this.registerAudioOutput({
        name: "out",
        getAudioNode: () => this.audioNode!,
      });
    }
  }

  protected registerAudioInput(props: Omit<AudioInputProps, "ioType">) {
    return this.inputs.add({ ...props, ioType: IOType.AudioInput });
  }

  protected registerAudioOutput(props: Omit<AudioOutputProps, "ioType">) {
    return this.outputs.add({ ...props, ioType: IOType.AudioOutput });
  }

  protected registerMidiInput(props: Omit<MidiInputProps, "ioType">) {
    return this.inputs.add({ ...props, ioType: IOType.MidiInput });
  }

  protected registerMidiOutput(props: Omit<MidiOutputProps, "ioType">) {
    return this.outputs.add({
      ...props,
      ioType: IOType.MidiOutput,
    });
  }

  protected get engine() {
    return Engine.getById(this.engineId);
  }

  protected get context() {
    return this.engine.context;
  }
}
