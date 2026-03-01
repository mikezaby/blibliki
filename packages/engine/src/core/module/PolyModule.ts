import { ContextTime } from "@blibliki/transport";
import {
  deterministicId,
  Optional,
  uuidv4,
  requestAnimationFrame,
} from "@blibliki/utils";
import { Engine } from "@/Engine";
import {
  ModuleType,
  ModuleTypeToModuleMapping,
  ModuleTypeToPropsMapping,
} from "@/modules";
import {
  IIOSerialize,
  InputCollection,
  IOType,
  MidiInputProps,
  MidiOutputProps,
  OutputCollection,
} from "../IO";
import { PolyAudioInputProps, PolyAudioOutputProps } from "../IO/PolyAudioIO";
import MidiEvent from "../midi/MidiEvent";
import { IModule, IModuleConstructor, Module } from "./Module";

export type IPolyModule<T extends ModuleType> = Omit<IModule<T>, "voiceNo"> & {
  voices: number;
};

export type IPolyModuleSerialize<T extends ModuleType> = IPolyModule<T> & {
  inputs: IIOSerialize[];
  outputs: IIOSerialize[];
};

export type IPolyModuleConstructor<T extends ModuleType> = Optional<
  IPolyModule<T>,
  "id"
> & {
  monoModuleConstructor: (
    engineId: string,
    params: IModuleConstructor<T>,
  ) => Module<T>;
};

export abstract class PolyModule<
  T extends ModuleType,
> implements IPolyModule<T> {
  id: string;
  engineId: string;
  moduleType: T;
  audioModules!: Module<T>[];
  inputs: InputCollection;
  outputs: OutputCollection;
  protected monoModuleConstructor: IPolyModuleConstructor<T>["monoModuleConstructor"];
  protected _props!: ModuleTypeToPropsMapping[T];
  private _voices!: number;
  private _name!: string;
  private pendingUIUpdates = false;

  /**
   * Factory method for creating modules with proper initialization timing.
   *
   * This method ensures hooks are called AFTER the child class constructor completes,
   * solving the ES6 class field initialization problem where function properties like hooks
   * aren't available during super() call.
   *
   * @example
   * const gain = Module.create(Gain, engineId, {
   *   name: "gain",
   *   moduleType: ModuleType.Gain,
   *   props: { gain: 0.5 }
   * });
   */
  static create<T extends ModuleType, M extends PolyModule<T>>(
    ModuleClass: new (engineId: string, params: IPolyModuleConstructor<T>) => M,
    engineId: string,
    params: IPolyModuleConstructor<T>,
  ): M {
    // Create instance with deferred prop initialization
    const instance = new ModuleClass(engineId, {
      ...params,
    });

    instance.props = { ...instance.props };

    return instance;
  }

  constructor(engineId: string, params: IPolyModuleConstructor<T>) {
    const { id, name, moduleType, voices, monoModuleConstructor, props } =
      params;

    this.audioModules = [];

    this.monoModuleConstructor = monoModuleConstructor;
    this.id = id ?? uuidv4();
    this.engineId = engineId;
    this.name = name;
    this.moduleType = moduleType;
    this._props = props;

    this.inputs = new InputCollection(
      this as unknown as PolyModule<ModuleType>,
    );
    this.outputs = new OutputCollection(
      this as unknown as PolyModule<ModuleType>,
    );

    // Defer hook calls until after subclass is fully initialized
    queueMicrotask(() => {
      this.voices = voices || 1;
      this.props = props;
      this.triggerPropsUpdate();
    });
  }

  get name() {
    return this._name;
  }

  set name(value: string) {
    this._name = value;
    this.audioModules.forEach((m) => (m.name = value));
  }

  get props(): ModuleTypeToPropsMapping[T] {
    return this._props;
  }

  set props(value: Partial<ModuleTypeToPropsMapping[T]>) {
    this._props = { ...this._props, ...value };
    this.audioModules.forEach((m) => (m.props = value));
  }

  get voices() {
    return this._voices;
  }

  set voices(value: number) {
    this._voices = value;
    this.adjustNumberOfModules();
    this.rePlugAll();
  }

  start(time: ContextTime): void {
    this.audioModules.forEach((m) => {
      m.start(time);
    });
  }

  stop(time: ContextTime): void {
    this.audioModules.forEach((m) => {
      m.stop(time);
    });
  }

  serialize(): IPolyModuleSerialize<T> {
    return {
      id: this.id,
      name: this.name,
      moduleType: this.moduleType,
      voices: this.voices,
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
    audioModule: Module<ModuleType> | PolyModule<ModuleType>;
    from: string;
    to: string;
  }) {
    const output = this.outputs.findByName(from);
    const input = audioModule.inputs.findByName(to);

    output.plug(input);
  }

  rePlugAll(callback?: () => void) {
    this.inputs.rePlugAll(callback);
    this.outputs.rePlugAll(callback);
  }

  protected unPlugAll() {
    this.inputs.unPlugAll();
    this.outputs.unPlugAll();
  }

  dispose() {
    this.inputs.unPlugAll();
    this.outputs.unPlugAll();
    this.audioModules.forEach((m) => {
      m.dispose();
    });
  }

  onMidiEvent = (midiEvent: MidiEvent) => {
    if (midiEvent.cc) {
      this.audioModules.forEach((m) => {
        m.onMidiEvent(midiEvent);
      });
      return;
    }

    const voiceNo = midiEvent.voiceNo ?? 0;
    const audioModule = this.findVoice(voiceNo);
    audioModule.onMidiEvent(midiEvent);
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
        voices: this.voices,
        name: this.name,
        props: this.props,
      });
      this.pendingUIUpdates = false;
    });
  }

  findVoice(voiceNo: number) {
    const moduleByVoice = this.audioModules.find((m) => m.voiceNo === voiceNo);
    if (!moduleByVoice)
      throw Error(`Voice ${voiceNo} on module ${this.name} not found`);

    return moduleByVoice;
  }

  protected registerDefaultIOs(value: "both" | "in" | "out" = "both") {
    this.registerMidiInput({
      name: "midi in",
      onMidiEvent: this.onMidiEvent,
    });

    if (value === "in" || value === "both") {
      this.registerAudioInput({
        name: "in",
      });
    }

    if (value === "out" || value === "both") {
      this.registerAudioOutput({
        name: "out",
      });
    }
  }

  protected registerAudioInput(props: Omit<PolyAudioInputProps, "ioType">) {
    return this.inputs.add({ ...props, ioType: IOType.PolyAudioInput });
  }

  protected registerAudioOutput(props: Omit<PolyAudioOutputProps, "ioType">) {
    return this.outputs.add({ ...props, ioType: IOType.PolyAudioOutput });
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

  private adjustNumberOfModules() {
    if (this.audioModules.length === this.voices) return;

    if (this.audioModules.length > this.voices) {
      const audioModule = this.audioModules.pop();
      audioModule?.dispose();
    } else {
      const voiceNo = this.audioModules.length;
      const id = deterministicId(this.id, voiceNo.toString());

      const audioModule = this.monoModuleConstructor(this.engineId, {
        id,
        name: this.name,
        moduleType: this.moduleType,
        voiceNo,
        props: { ...this.props },
        parentModule: this as unknown as ModuleTypeToModuleMapping[T],
      });

      this.audioModules.push(audioModule);
    }

    this.adjustNumberOfModules();
  }

  protected get engine() {
    return Engine.getById(this.engineId);
  }

  protected get context() {
    return this.engine.context;
  }
}
