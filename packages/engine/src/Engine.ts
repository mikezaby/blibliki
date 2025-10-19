import { assertDefined, Optional, pick, uuidv4 } from "@blibliki/utils";
import {
  IAnyAudioContext,
  IRoute,
  Routes,
  MidiDeviceManager,
  IModule,
  TTime,
  Transport,
  MidiEvent,
} from "@/core";
import {
  ICreateModule,
  ModuleParams,
  ModuleType,
  ModuleTypeToModuleMapping,
  createModule,
} from "@/modules";
import { PolyModule } from "./core/module/PolyModule";
import { loadProcessors } from "./processors";

export type IUpdateModule<T extends ModuleType> = {
  id: string;
  moduleType: T;
  changes: Partial<Omit<ICreateModule<T>, "id" | "moduleType" | "voice">> & {
    voices?: number;
  };
};

export type ICreateRoute = Optional<IRoute, "id">;

export class Engine {
  private static _engines = new Map<string, Engine>();
  private static _currentId: string | undefined;
  private propsUpdateCallbacks: (<T extends ModuleType>(
    params: IModule<T>,
  ) => void)[] = [];

  readonly id: string;
  context: IAnyAudioContext;
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

  async start(props: { offset?: TTime; actionAt?: TTime } = {}) {
    await this.resume();
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

  get timeSignature() {
    return this.transport.timeSignature;
  }

  set timeSignature(value: [number, number]) {
    this.transport.timeSignature = value;
  }

  get playhead() {
    return this.transport.playhead;
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

    virtualMidi.sendMidi(MidiEvent.fromNote(noteName, type === "noteOn"));
  }

  private onStart = (actionAt: TTime) => {
    this.modules.forEach((module) => {
      module.start(actionAt);
    });
  };

  private onStop = (actionAt: TTime) => {
    this.modules.forEach((module) => {
      module.stop(actionAt);
    });
  };
}
