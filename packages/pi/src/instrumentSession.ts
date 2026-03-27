import { Engine, type IEngineSerialize } from "@blibliki/engine";
import { ModuleType as EngineModuleType } from "@blibliki/engine";
import {
  createInstrumentEnginePatch,
  createTrackFromDocument,
  type CompiledInstrumentEnginePatch,
  type CreateInstrumentEnginePatchOptions,
  type InstrumentDisplayState,
  type InstrumentDocument,
  type InstrumentTrackDocument,
} from "@blibliki/instrument";
import {
  createInstrumentControllerSession,
  type CreateInstrumentControllerSessionOptions,
  type InstrumentControllerEngine,
  type InstrumentControllerSession,
} from "@/instrumentControllerSession";

export type InstrumentSessionDrone = {
  trackKey: string;
  note: string;
};

export type InstrumentSessionOptions = CreateInstrumentEnginePatchOptions & {
  drone?: InstrumentSessionDrone | false;
};

export type InstrumentSession = {
  compiledInstrument: CompiledInstrumentEnginePatch["compiledInstrument"];
  patch: IEngineSerialize;
  runtime: CompiledInstrumentEnginePatch["runtime"] & {
    droneMidiId?: string;
    droneTrackKey?: string;
    droneNote?: string;
  };
};

export type InstrumentSessionEngine = InstrumentControllerEngine & {
  dispose: () => void;
  findMidiOutputDeviceByFuzzyName?: (
    name: string,
    threshold?: number,
  ) => {
    device: {
      name: string;
    };
    score: number;
  } | null;
  triggerVirtualMidi: (
    moduleId: string,
    note: string,
    type: "noteOn" | "noteOff",
  ) => void;
};

export type StartInstrumentSessionOptions = InstrumentSessionOptions &
  CreateInstrumentControllerSessionOptions & {
    engineLoader?: (
      patch: InstrumentSession["patch"],
    ) => Promise<InstrumentSessionEngine>;
  };

export type StartedInstrumentSession = {
  session: InstrumentSession;
  engine: InstrumentSessionEngine;
  controllerSession: InstrumentControllerSession;
  getDisplayState: () => InstrumentDisplayState;
  dispose: () => void;
};

function createRuntimeModuleId(trackKey: string, suffix: string) {
  return `${trackKey}.runtime.${suffix}`;
}

function createDroneModule(id: string): IEngineSerialize["modules"][number] {
  return {
    id,
    name: "Instrument Drone",
    moduleType: EngineModuleType.VirtualMidi,
    voiceNo: 0,
    props: {
      activeNotes: [],
    },
    inputs: [],
    outputs: [],
  };
}

function toEngineSerializableModule(module: {
  id: string;
  name: string;
  moduleType: EngineModuleType;
  props: Record<string, unknown>;
  voices?: number;
}): IEngineSerialize["modules"][number] {
  if (module.voices !== undefined) {
    return {
      ...module,
      voices: module.voices,
      inputs: [],
      outputs: [],
    };
  }

  return {
    ...module,
    voiceNo: 0,
    inputs: [],
    outputs: [],
  };
}

function createDroneRuntime(
  trackDocument: InstrumentTrackDocument,
  voices: number,
  droneMidiId: string,
  includeModules: boolean,
) {
  const track = createTrackFromDocument(trackDocument, voices);

  return track.createInternalMidiRuntime(
    { moduleId: droneMidiId, ioName: "midi out" },
    {
      scopeBlockPlugs: true,
      includeModules,
    },
  );
}

export function createInstrumentSession(
  document: InstrumentDocument,
  options: InstrumentSessionOptions = {},
): InstrumentSession {
  const runtimePatch = createInstrumentEnginePatch(document, options);
  const drone = options.drone;

  if (!drone) {
    return runtimePatch;
  }

  const trackDocument = document.tracks.find(
    (candidate) => candidate.key === drone.trackKey,
  );
  if (!trackDocument) {
    throw new Error(
      `Instrument session drone track ${drone.trackKey} was not found`,
    );
  }

  const droneMidiId = createRuntimeModuleId(trackDocument.key, "droneMidi");
  const trackVoices = options.trackVoices ?? 8;
  const voiceSchedulerId = createRuntimeModuleId(
    trackDocument.key,
    "voiceScheduler",
  );
  const hasVoiceScheduler = runtimePatch.patch.modules.some(
    (module) => module.id === voiceSchedulerId,
  );
  const droneRuntime = createDroneRuntime(
    trackDocument,
    trackVoices,
    droneMidiId,
    !hasVoiceScheduler,
  );

  return {
    compiledInstrument: runtimePatch.compiledInstrument,
    runtime: {
      ...runtimePatch.runtime,
      droneMidiId,
      droneTrackKey: drone.trackKey,
      droneNote: drone.note,
    },
    patch: {
      ...runtimePatch.patch,
      modules: [
        ...runtimePatch.patch.modules,
        ...droneRuntime.modules.map(toEngineSerializableModule),
        createDroneModule(droneMidiId),
      ],
      routes: [...runtimePatch.patch.routes, ...droneRuntime.routes],
    },
  };
}

async function loadEngine(
  patch: InstrumentSession["patch"],
): Promise<InstrumentSessionEngine> {
  return (await Engine.load(patch)) as InstrumentSessionEngine;
}

export async function startInstrumentSession(
  document: InstrumentDocument,
  options: StartInstrumentSessionOptions = {},
): Promise<StartedInstrumentSession> {
  const session = createInstrumentSession(document, options);
  const engine = await (options.engineLoader ?? loadEngine)(session.patch);

  if (session.runtime.droneMidiId && session.runtime.droneNote) {
    engine.triggerVirtualMidi(
      session.runtime.droneMidiId,
      session.runtime.droneNote,
      "noteOn",
    );
  }

  const controllerSession = createInstrumentControllerSession(
    engine,
    {
      compiledInstrument: session.compiledInstrument,
      patch: session.patch,
      runtime: session.runtime,
    },
    {
      onRuntimePatchChange: options.onRuntimePatchChange,
      onDisplayStateChange: options.onDisplayStateChange,
    },
  );

  return {
    session,
    engine,
    controllerSession,
    getDisplayState: () => controllerSession.getDisplayState(),
    dispose: () => {
      if (session.runtime.droneMidiId && session.runtime.droneNote) {
        try {
          engine.triggerVirtualMidi(
            session.runtime.droneMidiId,
            session.runtime.droneNote,
            "noteOff",
          );
        } catch {
          // Ignore shutdown note-off issues; engine disposal is final anyway.
        }
      }

      controllerSession.dispose();
      engine.dispose();
    },
  };
}
