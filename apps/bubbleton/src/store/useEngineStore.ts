import {
  Engine,
  ModuleType,
  ICreateModule,
  ICreateRoute,
  IUpdateModule,
  IModuleSerialize,
  IPolyModuleSerialize,
  IRoute,
  TimeSignature,
} from "@blibliki/engine";
import { assertDefined, Context } from "@blibliki/utils";
import { create } from "zustand";

export type AnyModuleSerialize =
  | IModuleSerialize<ModuleType>
  | IPolyModuleSerialize<ModuleType>;

type EngineStore = {
  id?: string;
  isInitialized: boolean;
  isPlaying: boolean;
  bpm: number;
  timeSignature: TimeSignature;
  modules: AnyModuleSerialize[];

  init: () => void;
  dispose: () => void;
  getEngine: () => Engine;
  start: () => Promise<void>;
  pause: () => void;
  stop: () => void;
  setBpm: (value: number) => void;
  setTimeSignature: (value: TimeSignature) => void;
  addModule: <T extends ModuleType>(
    params: ICreateModule<T>,
  ) => AnyModuleSerialize;
  updateModule: <T extends ModuleType>(
    params: IUpdateModule<T>,
  ) => AnyModuleSerialize;
  removeModule: (id: string) => void;
  addRoute: (params: ICreateRoute) => IRoute;
  removeRoute: (id: string) => void;
};

export const useEngineStore = create<EngineStore>((set, get) => ({
  id: undefined,
  isInitialized: false,
  isPlaying: false,
  bpm: 120,
  timeSignature: [4, 4] as const,
  modules: [],

  getEngine: () => {
    const id = get().id;
    assertDefined(id);

    return Engine.getById(id);
  },

  init: () => {
    const { id } = get();
    if (id) return;

    const context = new Context();
    const newEngine = new Engine(context);
    set({ id: newEngine.id, isInitialized: true });
    void newEngine.initialize();
  },

  dispose: () => {
    const { getEngine } = get();
    const engine = getEngine();

    engine.dispose();
    set({
      id: undefined,
      isPlaying: false,
      modules: Array.from(engine.modules.values()).map((module) =>
        module.serialize(),
      ),
    });
  },

  start: async () => {
    await get().getEngine().start();
    set({ isPlaying: true });
  },

  pause: () => {
    get().getEngine().pause();
    set({ isPlaying: false });
  },

  stop: () => {
    get().getEngine().stop();
    set({ isPlaying: false });
  },

  setBpm: (value: number) => {
    get().getEngine().bpm = value;
    set({ bpm: value });
  },

  setTimeSignature: (value: TimeSignature) => {
    get().getEngine().timeSignature = value;
    set({ timeSignature: value });
  },

  addModule: (params) => {
    const { modules, getEngine } = get();
    const engine = getEngine();

    const newModule = engine.addModule(params);
    set({ modules: [...modules, newModule] });
    return newModule;
  },

  updateModule: (params) => {
    const { getEngine, modules } = get();
    const engine = getEngine();

    const updated = engine.updateModule(params);
    const updatedModules = modules.map((m) =>
      m.id === updated.id ? updated : m,
    );
    set({ modules: updatedModules });
    return updated;
  },

  removeModule: (id) => {
    const { getEngine, modules } = get();
    const engine = getEngine();

    engine.removeModule(id);
    set({ modules: modules.filter((m) => m.id !== id) });
  },

  addRoute: (params) => {
    const { getEngine } = get();
    const engine = getEngine();

    return engine.addRoute(params);
  },

  removeRoute: (id) => {
    const { getEngine } = get();
    const engine = getEngine();

    engine.removeRoute(id);
  },
}));
