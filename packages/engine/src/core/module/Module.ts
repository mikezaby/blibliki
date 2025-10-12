import { Optional, upperFirst, uuidv4 } from "@blibliki/utils";
import { Engine } from "@/Engine";
import { AnyModule, ModuleType, ModuleTypeToPropsMapping } from "@/modules";
import { IAnyAudioContext } from "../";
import {
  AudioInputProps,
  AudioOutputProps,
  IIOSerialize,
  IOType,
  InputCollection,
  OutputCollection,
  MidiInputProps,
  MidiOutputProps,
} from "../IO";
import Note from "../Note";
import { TTime } from "../Timing/Time";
import MidiEvent, { MidiEventType } from "../midi/MidiEvent";

export type IModule<T extends ModuleType> = {
  id: string;
  name: string;
  voiceNo: number;
  moduleType: T;
  props: ModuleTypeToPropsMapping[T];
};

export type IModuleSerialize<T extends ModuleType> = IModule<T> & {
  inputs: IIOSerialize[];
  outputs: IIOSerialize[];
};

export type IModuleConstructor<T extends ModuleType> = Optional<
  IModule<T>,
  "id" | "voiceNo"
> & {
  audioNodeConstructor?: (context: IAnyAudioContext) => AudioNode;
};

export abstract class Module<T extends ModuleType> implements IModule<T> {
  id: string;
  engineId: string;
  name: string;
  moduleType: T;
  voiceNo: number;
  audioNode: AudioNode | undefined;
  inputs: InputCollection;
  outputs: OutputCollection;
  protected _props!: ModuleTypeToPropsMapping[T];
  protected superInitialized = false;
  protected activeNotes: Note[];

  constructor(engineId: string, params: IModuleConstructor<T>) {
    const { id, name, moduleType, voiceNo, audioNodeConstructor, props } =
      params;

    this.id = id ?? uuidv4();
    this.engineId = engineId;
    this.name = name;
    this.moduleType = moduleType;
    this.voiceNo = voiceNo ?? 0;
    this.activeNotes = [];
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
      voiceNo: this.voiceNo,
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

  start(_time: TTime): void {
    // Optional implementation in modules
  }

  stop(_time: TTime): void {
    // Optional implementation in modules
  }

  triggerAttack(note: Note, _triggeredAt: TTime): void {
    if (this.activeNotes.some((n) => n.fullName === note.fullName)) return;

    this.activeNotes.push(note);
  }

  triggerRelease(note: Note, _triggeredAt: TTime): void {
    this.activeNotes = this.activeNotes.filter(
      (n) => n.fullName !== note.fullName,
    );
  }

  onMidiEvent = (midiEvent: MidiEvent) => {
    const { note, triggeredAt } = midiEvent;

    switch (midiEvent.type) {
      case MidiEventType.noteOn: {
        this.triggerAttack(note!, triggeredAt);
        break;
      }
      case MidiEventType.noteOff:
        this.triggerRelease(note!, triggeredAt);
        break;
      default:
        throw Error("This type is not a note");
    }
  };

  protected triggerPropsUpdate() {
    this.engine._triggerPropsUpdate({
      id: this.id,
      moduleType: this.moduleType,
      voiceNo: this.voiceNo,
      name: this.name,
      props: this.props,
    });
  }

  dispose() {
    this.inputs.unPlugAll();
    this.outputs.unPlugAll();
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
