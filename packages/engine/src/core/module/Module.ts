import { ContextTime } from "@blibliki/transport";
import { Context, Optional, upperFirst, uuidv4 } from "@blibliki/utils";
import { Engine } from "@/Engine";
import { AnyModule, ModuleType, ModuleTypeToPropsMapping } from "@/modules";
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
  audioNodeConstructor?: (context: Context) => AudioNode;
};

export type SetterHooks<P> = {
  [K in keyof P as `onSet${Capitalize<string & K>}`]: (value: P[K]) => P[K];
} & {
  [K in keyof P as `onAfterSet${Capitalize<string & K>}`]: (
    value: P[K],
  ) => void;
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
  protected activeNotes: Note[];
  private pendingUIUpdates = false;

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
    this._props = props;

    this.inputs = new InputCollection(this);
    this.outputs = new OutputCollection(this);

    // Defer hook calls until after subclass is fully initialized
    queueMicrotask(() => {
      this.props = props;
    });
  }

  get props(): ModuleTypeToPropsMapping[T] {
    return this._props;
  }

  set props(value: Partial<ModuleTypeToPropsMapping[T]>) {
    const updatedValue = { ...value };

    (Object.keys(value) as (keyof ModuleTypeToPropsMapping[T])[]).forEach(
      (key) => {
        const propValue = value[key];
        if (propValue !== undefined) {
          const result = this.callPropHook("onSet", key, propValue);
          if (result !== undefined) {
            updatedValue[key] = result;
          }
        }
      },
    );

    this._props = { ...this._props, ...updatedValue };

    (
      Object.keys(updatedValue) as (keyof ModuleTypeToPropsMapping[T])[]
    ).forEach((key) => {
      const propValue = updatedValue[key];
      if (propValue !== undefined) {
        this.callPropHook("onAfterSet", key, propValue);
      }
    });
  }

  private callPropHook<K extends keyof ModuleTypeToPropsMapping[T]>(
    hookType: "onSet" | "onAfterSet",
    key: K,
    value: ModuleTypeToPropsMapping[T][K],
  ): ModuleTypeToPropsMapping[T][K] | undefined {
    const hookName = `${hookType}${upperFirst(key as string)}`;
    const hook = this[hookName as keyof this];

    if (typeof hook === "function") {
      const result = (
        hook as (
          value: ModuleTypeToPropsMapping[T][K],
        ) => ModuleTypeToPropsMapping[T][K] | undefined
      ).call(this, value);
      return result;
    }
    return undefined;
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

  start(_time: ContextTime): void {
    // Optional implementation in modules
  }

  stop(_time: ContextTime): void {
    // Optional implementation in modules
  }

  triggerAttack(note: Note, _triggeredAt: ContextTime): void {
    if (this.activeNotes.some((n) => n.fullName === note.fullName)) return;

    this.activeNotes.push(note);
  }

  triggerRelease(note: Note, _triggeredAt: ContextTime): void {
    this.activeNotes = this.activeNotes.filter(
      (n) => n.fullName !== note.fullName,
    );
  }

  handleCC(_event: MidiEvent, _triggeredAt: ContextTime): void {
    // Optional implementation in modules
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
      case MidiEventType.cc:
        this.handleCC(midiEvent, triggeredAt);
        break;
      default:
        throw Error("This type is not a note");
    }
  };

  triggerPropsUpdate = () => {
    if (this.pendingUIUpdates) return;

    this.pendingUIUpdates = true;
    this.sheduleTriggerUpdate();
  };

  private sheduleTriggerUpdate() {
    requestAnimationFrame(() => {
      this.engine._triggerPropsUpdate({
        id: this.id,
        moduleType: this.moduleType,
        voiceNo: this.voiceNo,
        name: this.name,
        props: this.props,
      });
      this.pendingUIUpdates = false;
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
