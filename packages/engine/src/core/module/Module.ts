import { ContextTime } from "@blibliki/transport";
import {
  Context,
  Optional,
  upperFirst,
  uuidv4,
  requestAnimationFrame,
} from "@blibliki/utils";
import { Engine } from "@/Engine";
import {
  AnyModule,
  ICreateModule,
  ModuleType,
  ModuleTypeToModuleMapping,
  ModuleTypeToPropsMapping,
  ModuleTypeToStateMapping,
} from "@/modules";
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
  parentModule?: ModuleTypeToModuleMapping[T];
};

export type SetterHooks<P> = {
  [K in keyof P as `onSet${Capitalize<string & K>}`]: (value: P[K]) => P[K];
} & {
  [K in keyof P as `onAfterSet${Capitalize<string & K>}`]: (
    value: P[K],
  ) => void;
};

export type StateSetterHooks<S> = {
  [K in keyof S as `onSetState${Capitalize<string & K>}`]: (
    value: S[K],
  ) => S[K];
} & {
  [K in keyof S as `onAfterSetState${Capitalize<string & K>}`]: (
    value: S[K],
  ) => void;
};

export abstract class Module<T extends ModuleType> implements IModule<T> {
  id: string;
  engineId: string;
  name: string;
  moduleType: T;
  voiceNo: number;
  readonly parentModule?: ModuleTypeToModuleMapping[T];
  audioNode: AudioNode | undefined;
  inputs: InputCollection;
  outputs: OutputCollection;
  protected _props!: ModuleTypeToPropsMapping[T];
  protected _state!: ModuleTypeToStateMapping[T];
  protected activeNotes: Note[];
  protected _propsInitialized = false;
  private pendingUIUpdates = false;

  /**
   * Factory method for creating modules with proper initialization timing.
   *
   * This method ensures hooks are called AFTER the child class constructor completes,
   * solving the ES6 class field initialization problem where function properties like hooks
   * aren't available during super() call.
   *
   * @example
   * const gain = Module.create(MonoGain, engineId, {
   *   name: "gain",
   *   moduleType: ModuleType.Gain,
   *   props: { gain: 0.5 }
   * });
   */
  static create<T extends ModuleType, M extends Module<T>>(
    ModuleClass: new (engineId: string, params: ICreateModule<T>) => M,
    engineId: string,
    params: Omit<IModuleConstructor<T>, "props"> & {
      props: Partial<IModule<T>["props"]>;
    },
  ): M {
    // Create instance with deferred prop initialization
    const instance = new ModuleClass(engineId, {
      ...params,
    });

    // Now trigger prop setters after child constructor has completed
    // At this point, all child class properties (including arrow functions) exist
    // TODO: We have to refactor all modules the remove the props assignment from constructor
    instance.props = { ...instance.props };
    instance._propsInitialized = true;

    return instance;
  }

  constructor(engineId: string, params: IModuleConstructor<T>) {
    const {
      id,
      name,
      moduleType,
      voiceNo,
      audioNodeConstructor,
      props,
      parentModule,
    } = params;

    this.id = id ?? uuidv4();
    this.engineId = engineId;
    this.name = name;
    this.moduleType = moduleType;
    this.voiceNo = voiceNo ?? 0;
    this.parentModule = parentModule;
    this.activeNotes = [];
    this.audioNode = audioNodeConstructor?.(this.context);
    this._props = props;

    this.inputs = new InputCollection(this);
    this.outputs = new OutputCollection(this);
  }

  get props(): ModuleTypeToPropsMapping[T] {
    return this._props;
  }

  set props(value: Partial<ModuleTypeToPropsMapping[T]>) {
    const updatedValue: Partial<ModuleTypeToPropsMapping[T]> = {};
    const isFirstSet = !this._propsInitialized;

    (Object.keys(value) as (keyof ModuleTypeToPropsMapping[T])[]).forEach(
      (key) => {
        const propValue = value[key];
        // On first set, always include the value. On subsequent sets, only if it changed.
        if (
          propValue !== undefined &&
          (isFirstSet || this._props[key] !== propValue)
        ) {
          const result = this.callPropHook("onSet", key, propValue);
          updatedValue[key] = result ?? propValue;
        }
      },
    );

    if (Object.keys(updatedValue).length === 0) return;

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

  get state(): ModuleTypeToStateMapping[T] {
    return this._state;
  }

  set state(value: Partial<ModuleTypeToStateMapping[T]>) {
    const updatedValue: Partial<ModuleTypeToStateMapping[T]> = {};

    (Object.keys(value) as (keyof ModuleTypeToStateMapping[T])[]).forEach(
      (key) => {
        const stateValue = value[key];
        if (stateValue !== undefined && this._state[key] !== stateValue) {
          const result = this.callStateHook("onSetState", key, stateValue);
          updatedValue[key] = result ?? stateValue;
        }
      },
    );

    if (Object.keys(updatedValue).length === 0) return;

    this._state = { ...this._state, ...updatedValue };

    (
      Object.keys(updatedValue) as (keyof ModuleTypeToStateMapping[T])[]
    ).forEach((key) => {
      const stateValue = updatedValue[key];
      if (stateValue !== undefined) {
        this.callStateHook("onAfterSetState", key, stateValue);
      }
    });
  }

  private callStateHook<K extends keyof ModuleTypeToStateMapping[T]>(
    hookType: "onSetState" | "onAfterSetState",
    key: K,
    value: ModuleTypeToStateMapping[T][K],
  ): ModuleTypeToStateMapping[T][K] | undefined {
    const hookName = `${hookType}${upperFirst(key as string)}`;
    const hook = this[hookName as keyof this];

    if (typeof hook === "function") {
      const result = (
        hook as (
          value: ModuleTypeToStateMapping[T][K],
        ) => ModuleTypeToStateMapping[T][K] | undefined
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
      const updateParams: IModule<T> & {
        state?: ModuleTypeToStateMapping[T];
      } = {
        id: this.id,
        moduleType: this.moduleType,
        voiceNo: this.voiceNo,
        name: this.name,
        props: this.props,
        state: this._state,
      };

      this.engine._triggerPropsUpdate(updateParams);
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
