import {
  Engine,
  ModuleType,
  ICreateModule,
  ICreateRoute,
  IUpdateModule,
  IRoute,
  IAnyModuleSerialize,
} from "@blibliki/engine";
import { assertDefined, Context } from "@blibliki/utils";
import { create } from "zustand";

type EngineStore = {
  id?: string;
  isInitialized: boolean;
  isStarted: boolean;
  modules: IAnyModuleSerialize[];

  init: () => Promise<void>;
  getEngine: () => Engine;
  start: () => Promise<void>;
  stop: () => void;
  addModule: <T extends ModuleType>(
    params: ICreateModule<T>,
  ) => IAnyModuleSerialize;
  updateModule: <T extends ModuleType>(
    params: IUpdateModule<T>,
  ) => IAnyModuleSerialize;
  removeModule: (id: string) => void;
  addRoute: (params: ICreateRoute) => IRoute;
  removeRoute: (id: string) => void;
  dispose: () => void;
};

export const useEngineStore = create<EngineStore>((set, get) => ({
  id: undefined,
  isInitialized: false,
  isStarted: false,
  modules: [],

  getEngine: () => {
    const id = get().id;
    assertDefined(id);

    return Engine.getById(id);
  },

  init: async () => {
    const { id } = get();
    if (id) return;

    const context = new Context();
    const newEngine = new Engine(context);
    await newEngine.initialize();
    set({ id: newEngine.id, isInitialized: true });
  },

  start: async () => {
    await get().getEngine().start();
    set({ isStarted: true });
  },

  stop: () => {
    get().getEngine().stop();
    set({ isStarted: false });
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

  dispose: () => {
    const { getEngine } = get();
    const engine = getEngine();

    engine.dispose();
    set({
      isStarted: false,
      modules: Array.from(engine.modules.values()).map((module) =>
        module.serialize(),
      ),
    });
  },
}));
