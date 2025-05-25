import { assertDefined, Optional, pick, uuidv4 } from "@blibliki/utils";
import {
  IAnyAudioContext,
  IModuleSerialize,
  IRoute,
  Routes,
  isStartable,
  MidiDeviceManager,
  IModule,
} from "@/core";
import { Transport } from "@/core/Timing";
import {
  ICreateModule,
  ModuleType,
  ModuleTypeToModuleMapping,
  createModule,
} from "@/modules";
import { TTime } from "./core/Timing/Time";
import MidiEvent from "./core/midi/MidiEvent";
import VirtualMidi from "./modules/VirtualMidi";
import { loadProcessors } from "./processors";

export interface IUpdateModule<T extends ModuleType> {
  id: string;
  moduleType: T;
  changes: Partial<Omit<ICreateModule<T>, "id" | "moduleType">>;
}

export type ICreateRoute = Optional<IRoute, "id">;

export class Engine {
  private static _engines: Map<string, Engine> = new Map();
  private static _currentId: string;
  private propsUpdateCallbacks: {
    <T extends ModuleType>(params: IModule<T>): void;
  }[] = [];

  readonly id: string;
  context: IAnyAudioContext;
  isInitialized: boolean = false;
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

  constructor(context: IAnyAudioContext) {
    this.id = uuidv4();

    this.context = context;
    this.transport = new Transport({
      onStart: this.onStart,
      onStop: this.onStop,
    });
    this.routes = new Routes(this);
    this.modules = new Map();
    this.midiDeviceManager = new MidiDeviceManager();

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
    const module = createModule<T>(this.id, params);
    this.modules.set(module.id, module);

    return module.serialize() as IModuleSerialize<T>;
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

    return module.serialize() as IModuleSerialize<T>;
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

  start(props: { offset?: TTime; actionAt?: TTime } = {}) {
    this.transport.start(props);
  }

  stop(props: { actionAt?: TTime } = {}) {
    this.transport.stop(props);
  }

  pause(props: { actionAt?: TTime } = {}) {
    this.transport.pause(props);
  }

  get bpm() {
    return this.transport.bpm;
  }

  set bpm(value: number) {
    this.transport.bpm = value;
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

  onPropsUpdate(callback: <T extends ModuleType>(params: IModule<T>) => void) {
    this.propsUpdateCallbacks.push(callback);
  }

  _triggerPropsUpdate<T extends ModuleType>(params: IModule<T>) {
    this.propsUpdateCallbacks.forEach((callback) => {
      callback(params);
    });
  }

  // TODO: Find better way to support this
  triggerVirtualMidi(id: string, noteName: string, type: "noteOn" | "noteOff") {
    const virtualMidi = this.findModule(id);
    if (virtualMidi.moduleType !== ModuleType.VirtualMidi)
      throw Error("This is not a virtual mid");

    (virtualMidi as VirtualMidi).sendMidi(
      MidiEvent.fromNote(noteName, type === "noteOn"),
    );
  }

  private onStart = (actionAt: TTime) => {
    this.modules.forEach((module) => {
      if (!isStartable(module)) return;

      module.start(actionAt);
    });
  };

  private onStop = (actionAt: TTime) => {
    this.modules.forEach((module) => {
      if (!isStartable(module)) return;

      module.stop(actionAt);
    });
  };
}
