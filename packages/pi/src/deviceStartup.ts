import { Engine, type IEngineSerialize } from "@blibliki/engine";
import type {
  InstrumentDisplayNotice,
  InstrumentDocument,
} from "@blibliki/instrument";
import {
  Device,
  Instrument,
  Patch,
  normalizeDeviceDeploymentTarget,
} from "@blibliki/models";
import {
  loadInstrumentWorkingCopy,
  saveInstrumentWorkingCopy,
} from "@/instrumentPersistence";
import {
  startInstrumentSession,
  type StartInstrumentSessionOptions,
  type InstrumentSessionEngine,
  type StartedInstrumentSession,
} from "@/instrumentSession";

type LoadablePatch = {
  engineSerialize: () => IEngineSerialize;
};

type LoadableInstrument = {
  id?: string;
  document: Record<string, unknown>;
  save?: () => Promise<void> | void;
};

type PatchEngine = {
  start: () => Promise<void> | void;
};

export type DeviceDeploymentDependencies = {
  loadPatch?: (patchId: string) => Promise<LoadablePatch>;
  loadInstrument?: (instrumentId: string) => Promise<LoadableInstrument>;
  loadEngine?: (patch: IEngineSerialize) => Promise<PatchEngine>;
  loadWorkingCopy?: (
    instrumentId: string,
  ) => InstrumentDocument | null | Promise<InstrumentDocument | null>;
  saveWorkingCopy?: (
    instrumentId: string,
    document: InstrumentDocument,
  ) => void | Promise<void>;
  startInstrumentSession?: typeof startInstrumentSession;
  instrumentSessionOptions?: Pick<
    StartInstrumentSessionOptions,
    | "onDisplayStateChange"
    | "onRuntimePatchChange"
    | "onDocumentChange"
    | "multiprocess"
  >;
};

export type StartedPatchDeployment = {
  kind: "patch";
  engine: PatchEngine;
};

export type StartedInstrumentDeployment = {
  kind: "instrument";
  startedSession: StartedInstrumentSession;
};

export type StartedDeviceDeployment =
  | StartedPatchDeployment
  | StartedInstrumentDeployment;

async function loadEngine(patch: IEngineSerialize) {
  return (await Engine.load(patch)) as InstrumentSessionEngine;
}

async function saveLoadedInstrumentDocument(
  instrument: LoadableInstrument,
  document: InstrumentDocument,
) {
  if (typeof instrument.save !== "function") {
    throw new Error("Remote instrument save is unavailable");
  }

  instrument.document = document as Record<string, unknown>;
  await instrument.save();
}

function formatErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function createStartedInstrumentSessionProxy(
  getCurrentSession: () => StartedInstrumentSession,
): StartedInstrumentSession {
  return {
    get session() {
      return getCurrentSession().session;
    },
    get engine() {
      return getCurrentSession().engine;
    },
    get controllerSession() {
      return getCurrentSession().controllerSession;
    },
    getDisplayState: () => getCurrentSession().getDisplayState(),
    dispose: () => {
      getCurrentSession().dispose();
    },
  };
}

export async function startDeviceDeployment(
  device: Device,
  dependencies: DeviceDeploymentDependencies = {},
): Promise<StartedDeviceDeployment> {
  const deploymentTarget = normalizeDeviceDeploymentTarget(device);
  if (!deploymentTarget) {
    throw new Error("Device deployment target is not configured");
  }

  if (deploymentTarget.kind === "patch") {
    const patch = await (dependencies.loadPatch ?? Patch.find)(
      deploymentTarget.patchId,
    );
    const engine = await (dependencies.loadEngine ?? loadEngine)(
      patch.engineSerialize(),
    );

    return {
      kind: "patch",
      engine,
    };
  }

  const loadWorkingCopy =
    dependencies.loadWorkingCopy ?? loadInstrumentWorkingCopy;
  const saveWorkingCopy =
    dependencies.saveWorkingCopy ?? saveInstrumentWorkingCopy;
  const loadInstrument = (id: string) =>
    (
      dependencies.loadInstrument ??
      ((instrumentId: string) => Instrument.find(instrumentId))
    )(id);
  const startSession =
    dependencies.startInstrumentSession ?? startInstrumentSession;
  const instrumentId = deploymentTarget.instrumentId;
  const workingCopy = await loadWorkingCopy(instrumentId);
  let instrument: LoadableInstrument | undefined;

  try {
    instrument = await loadInstrument(instrumentId);
  } catch (error) {
    if (!workingCopy) {
      throw error;
    }
  }

  const instrumentDocument =
    workingCopy ??
    (instrument?.document as InstrumentDocument | undefined) ??
    undefined;
  if (!instrumentDocument) {
    throw new Error("Instrument document could not be loaded");
  }

  try {
    await saveWorkingCopy(instrumentId, instrumentDocument);
  } catch (error) {
    console.error(
      "Failed to cache initial instrument working copy:",
      error instanceof Error ? error.message : error,
    );
  }

  let currentDocument = instrumentDocument;
  let currentStartedSession: StartedInstrumentSession | undefined;
  let persistenceQueue = Promise.resolve();
  const queueLocalDraftSave = (nextDocument: InstrumentDocument) => {
    persistenceQueue = persistenceQueue
      .then(async () => {
        try {
          await saveWorkingCopy(instrumentId, nextDocument);
        } catch (error) {
          console.error(
            "Failed to save local instrument working copy:",
            error instanceof Error ? error.message : error,
          );
        }
      })
      .catch((error: unknown) => {
        console.error(
          "Failed to persist instrument working copy:",
          error instanceof Error ? error.message : error,
        );
      });
  };

  const startManagedInstrumentSession = async (
    nextDocument: InstrumentDocument,
    initialDisplayNotice?: InstrumentDisplayNotice,
  ) => {
    currentDocument = nextDocument;
    currentStartedSession = await startSession(nextDocument, {
      ...dependencies.instrumentSessionOptions,
      initialDisplayNotice,
      onDocumentChange: (updatedDocument, runtimePatch) => {
        currentDocument = updatedDocument;
        queueLocalDraftSave(updatedDocument);
        void dependencies.instrumentSessionOptions?.onDocumentChange?.(
          updatedDocument,
          runtimePatch,
        );
      },
      onPersistenceRequest: async (action, updatedDocument, _runtimePatch) => {
        currentDocument = updatedDocument;
        await persistenceQueue;

        if (action === "saveDraft") {
          try {
            const remoteInstrument =
              instrument ?? (await loadInstrument(instrumentId));
            await saveLoadedInstrumentDocument(
              remoteInstrument,
              updatedDocument,
            );
            instrument = remoteInstrument;

            return {
              title: "SAVE COMPLETE",
              message: "Firestore updated",
              tone: "success",
            } satisfies InstrumentDisplayNotice;
          } catch (error) {
            return {
              title: "SAVE FAILED",
              message: formatErrorMessage(error),
              tone: "error",
            } satisfies InstrumentDisplayNotice;
          }
        }

        let remoteInstrument: LoadableInstrument;
        try {
          remoteInstrument = await loadInstrument(instrumentId);
        } catch (error) {
          return {
            title: "RELOAD FAILED",
            message: formatErrorMessage(error),
            tone: "error",
          } satisfies InstrumentDisplayNotice;
        }

        const remoteDocument = remoteInstrument.document as
          | InstrumentDocument
          | undefined;
        if (!remoteDocument) {
          return {
            title: "RELOAD FAILED",
            message: "Remote instrument document is missing",
            tone: "error",
          } satisfies InstrumentDisplayNotice;
        }

        const previousDocument = currentDocument;
        currentStartedSession?.dispose();

        try {
          instrument = remoteInstrument;
          await startManagedInstrumentSession(remoteDocument, {
            title: "REMOTE RELOADED",
            message: "Local draft discarded",
            tone: "success",
          });
          try {
            await saveWorkingCopy(instrumentId, remoteDocument);
          } catch (error) {
            console.error(
              "Failed to replace local working copy after remote reload:",
              error instanceof Error ? error.message : error,
            );
          }
          return;
        } catch (error) {
          await startManagedInstrumentSession(previousDocument, {
            title: "RELOAD FAILED",
            message: formatErrorMessage(error),
            tone: "error",
          });
          return;
        }
      },
    });

    return currentStartedSession;
  };

  await startManagedInstrumentSession(instrumentDocument);
  if (!currentStartedSession) {
    throw new Error("Instrument session could not be started");
  }

  return {
    kind: "instrument",
    startedSession: createStartedInstrumentSessionProxy(() => {
      if (!currentStartedSession) {
        throw new Error("Instrument session is not available");
      }

      return currentStartedSession;
    }),
  };
}
