import { BPM, Ticks, TimeSignature, Transport } from "@blibliki/transport";
import {
  assertDefined,
  Context,
  Optional,
  pick,
  uuidv4,
} from "@blibliki/utils";
import {
  IRoute,
  Routes,
  MidiDeviceManager,
  IModule,
  MidiEvent,
  IModuleSerialize,
} from "@/core";
import {
  ICreateModule,
  ModuleParams,
  ModuleType,
  ModuleTypeToModuleMapping,
  ModuleTypeToStateMapping,
  createModule,
} from "@/modules";
import {
  IPolyModule,
  IPolyModuleSerialize,
  PolyModule,
} from "./core/module/PolyModule";
import { loadProcessors } from "./processors";

export type IUpdateModule<T extends ModuleType> = {
  id: string;
  moduleType: T;
  changes: Partial<Omit<ICreateModule<T>, "id" | "moduleType" | "voice">> & {
    voices?: number;
  };
};

export type ICreateRoute = Optional<IRoute, "id">;

export interface IEngineSerialize {
  bpm: BPM;
  timeSignature: TimeSignature;
  modules: (IModuleSerialize<ModuleType> | IPolyModuleSerialize<ModuleType>)[];
  routes: IRoute[];
}

export class Engine {
  private static _engines = new Map<string, Engine>();
  private static _currentId: string | undefined;
  private propsUpdateCallbacks: (<T extends ModuleType>(
    params: IModule<T> | IPolyModule<T>,
  ) => void)[] = [];

  readonly id: string;
  context: Context;
  isInitialized = false;
  routes: Routes;
  transport: Transport;
  modules: Map<
    string,
    ModuleTypeToModuleMapping[keyof ModuleTypeToModuleMapping]
  >;

  midiDeviceManager: MidiDeviceManager;

  static getById(id: string): Engine {
    const engine = Engine._engines.get(id);
    assertDefined(engine);

    return engine;
  }

  static get current(): Engine {
    assertDefined(this._currentId);

    return this.getById(this._currentId);
  }

  static async load(data: IEngineSerialize): Promise<Engine> {
    const { bpm, timeSignature, modules, routes } = data;
    const context = new Context();
    const engine = new Engine(context);
    await engine.initialize();

    engine.timeSignature = timeSignature;
    engine.bpm = bpm;
    modules.forEach((m) => {
      engine.addModule(m);
    });
    routes.forEach((r) => {
      engine.addRoute(r);
    });

    return engine;
  }

  constructor(context: Context) {
    this.id = uuidv4();

    this.context = context;
    this.transport = new Transport(this.context, {
      onStart: this.onStart,
      onStop: this.onStop,
    });
    this.routes = new Routes(this);
    this.modules = new Map();
    this.midiDeviceManager = new MidiDeviceManager(this.context);

    Engine._engines.set(this.id, this);
    Engine._currentId = this.id;
  }

  get state() {
    return this.transport.state;
  }

  async initialize() {
    if (this.isInitialized) return;

    await loadProcessors(this.context);
    await this.midiDeviceManager.initialize();
    this.isInitialized = true;
  }

  addModule<T extends ModuleType>(params: ICreateModule<T>) {
    const module = createModule(this.id, params as ModuleParams);
    this.modules.set(module.id, module);

    return module.serialize();
  }

  updateModule<T extends ModuleType>(params: IUpdateModule<T>) {
    const module = this.findModule(params.id);
    if (module.moduleType !== params.moduleType) {
      throw Error(
        `The module id ${params.id} isn't moduleType ${params.moduleType}`,
      );
    }

    const updates = pick(params.changes, ["name", "props"]);
    Object.assign(module, updates);

    if (module instanceof PolyModule && params.changes.voices !== undefined) {
      module.voices = params.changes.voices;
    }

    return module.serialize();
  }

  removeModule(id: string) {
    this.modules.delete(id);
  }

  addRoute(props: ICreateRoute): IRoute {
    return this.routes.addRoute(props);
  }

  removeRoute(id: string) {
    this.routes.removeRoute(id);
  }

  validRoute(props: Optional<IRoute, "id">): boolean {
    const { source, destination } = props;

    const output = this.findIO(source.moduleId, source.ioName, "output");
    const input = this.findIO(
      destination.moduleId,
      destination.ioName,
      "input",
    );

    return (
      (output.isMidi() && input.isMidi()) ||
      (output.isAudio() && input.isAudio())
    );
  }

  async start() {
    await this.resume();
    const actionAt = this.context.currentTime;
    this.transport.start(actionAt);
  }

  stop() {
    const actionAt = this.context.currentTime;
    this.transport.stop(actionAt);
    this.transport.reset(actionAt);
  }

  pause() {
    const actionAt = this.context.currentTime;
    this.transport.stop(actionAt);
  }

  get bpm() {
    return this.transport.bpm;
  }

  set bpm(value: number) {
    this.transport.bpm = value;
  }

  get timeSignature() {
    return this.transport.timeSignature;
  }

  set timeSignature(value: TimeSignature) {
    this.transport.timeSignature = value;
  }

  async resume() {
    await this.context.resume();
  }

  dispose() {
    this.stop();
    this.routes.clear();
    this.modules.forEach((module) => {
      module.dispose();
    });
    this.modules.clear();
  }

  serialize(): IEngineSerialize {
    return {
      bpm: this.bpm,
      timeSignature: this.timeSignature,
      modules: Array.from(this.modules.values()).map((m) => m.serialize()),
      routes: this.routes.serialize(),
    };
  }

  findModule(
    id: string,
  ): ModuleTypeToModuleMapping[keyof ModuleTypeToModuleMapping] {
    const module = this.modules.get(id);
    if (!module) throw Error(`The module with id ${id} is not exists`);

    return module;
  }

  findIO(moduleId: string, ioName: string, type: "input" | "output") {
    const module = this.findModule(moduleId);
    return module[`${type}s`].findByName(ioName);
  }

  findMidiDevice(id: string) {
    return this.midiDeviceManager.find(id);
  }

  findMidiDeviceByName(name: string) {
    return this.midiDeviceManager.findByName(name);
  }

  findMidiDeviceByFuzzyName(name: string, threshold?: number) {
    return this.midiDeviceManager.findByFuzzyName(name, threshold);
  }

  findMidiInputDevice(id: string) {
    return this.midiDeviceManager.findInput(id);
  }

  findMidiInputDeviceByName(name: string) {
    return this.midiDeviceManager.findInputByName(name);
  }

  findMidiInputDeviceByFuzzyName(name: string, threshold?: number) {
    return this.midiDeviceManager.findInputByFuzzyName(name, threshold);
  }

  findMidiOutputDevice(id: string) {
    return this.midiDeviceManager.findOutput(id);
  }

  findMidiOutputDeviceByName(name: string) {
    return this.midiDeviceManager.findOutputByName(name);
  }

  findMidiOutputDeviceByFuzzyName(name: string, threshold?: number) {
    return this.midiDeviceManager.findOutputByFuzzyName(name, threshold);
  }

  onPropsUpdate(
    callback: <T extends ModuleType>(
      params: (IModule<T> | IPolyModule<T>) & {
        state?: ModuleTypeToStateMapping[T];
      },
    ) => void,
  ) {
    this.propsUpdateCallbacks.push(callback);
  }

  _triggerPropsUpdate<T extends ModuleType>(
    params: (IModule<T> | IPolyModule<T>) & {
      state?: ModuleTypeToStateMapping[T];
    },
  ) {
    this.propsUpdateCallbacks.forEach((callback) => {
      callback(params);
    });
  }

  // TODO: Find better way to support this
  triggerVirtualMidi(id: string, noteName: string, type: "noteOn" | "noteOff") {
    const virtualMidi = this.findModule(id);
    if (virtualMidi.moduleType !== ModuleType.VirtualMidi)
      throw Error("This is not a virtual mid");

    virtualMidi.sendMidi(
      MidiEvent.fromNote(noteName, type === "noteOn", this.context.currentTime),
    );
  }

  // actionAt is context time
  private onStart = (ticks: Ticks) => {
    const actionAt = this.transport.getContextTimeAtTicks(ticks);

    this.modules.forEach((module) => {
      module.start(actionAt);
    });
  };

  // actionAt is context time
  private onStop = (ticks: Ticks) => {
    const actionAt = this.transport.getContextTimeAtTicks(ticks);

    this.modules.forEach((module) => {
      module.stop(actionAt);
    });
  };
}
