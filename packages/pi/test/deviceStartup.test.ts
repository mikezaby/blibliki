import type { IEngineSerialize } from "@blibliki/engine";
import {
  createDefaultInstrumentDocument,
  type InstrumentDocument,
} from "@blibliki/instrument";
import type { InstrumentDisplayState } from "@blibliki/instrument";
import { Device } from "@blibliki/models";
import { describe, expect, it, vi } from "vitest";
import { startDeviceDeployment } from "@/deviceStartup";
import type {
  StartedInstrumentSession,
  StartInstrumentSessionOptions,
} from "@/instrumentSession";

const PATCH: IEngineSerialize = {
  bpm: 120,
  timeSignature: [4, 4],
  modules: [],
  routes: [],
};

describe("startDeviceDeployment", () => {
  it("normalizes legacy patchId devices to the patch startup path", async () => {
    const device = new Device({
      token: "token-1",
      name: "Device",
      patchId: "patch-1",
      userId: "user-1",
    });

    const calls: string[] = [];

    await startDeviceDeployment(device, {
      loadPatch: (patchId) => {
        calls.push(`loadPatch:${patchId}`);
        return Promise.resolve({
          engineSerialize: () => PATCH,
        });
      },
      loadInstrument: () =>
        Promise.reject(new Error("Instrument path should not be used")),
      loadEngine: (patch) => {
        calls.push(`loadEngine:${patch.modules.length}`);
        return Promise.resolve({
          start: () => {
            calls.push("startPatch");
            return Promise.resolve();
          },
        });
      },
      startInstrumentSession: () =>
        Promise.reject(new Error("Instrument path should not be used")),
    });

    expect(device.deploymentTarget).toEqual({
      kind: "patch",
      patchId: "patch-1",
    });
    expect(calls).toEqual(["loadPatch:patch-1", "loadEngine:0"]);
  });

  it("starts the instrument runtime when the device targets an instrument document", async () => {
    const device = new Device({
      token: "token-1",
      name: "Device",
      deploymentTarget: {
        kind: "instrument",
        instrumentId: "instrument-1",
      },
      userId: "user-1",
    });

    const document = createDefaultInstrumentDocument();
    const calls: string[] = [];

    await startDeviceDeployment(device, {
      loadPatch: () =>
        Promise.reject(new Error("Patch path should not be used")),
      loadInstrument: (instrumentId) => {
        calls.push(`loadInstrument:${instrumentId}`);
        return Promise.resolve({ document });
      },
      loadEngine: () =>
        Promise.reject(new Error("Patch engine should not be used")),
      startInstrumentSession: (instrumentDocument) => {
        calls.push(`startInstrument:${instrumentDocument.name}`);
        return Promise.resolve({
          session: {
            compiledInstrument: {
              name: instrumentDocument.name,
              templateId: instrumentDocument.templateId,
              hardwareProfileId: instrumentDocument.hardwareProfileId,
              globalBlock: instrumentDocument.globalBlock,
              tracks: [],
            },
            patch: PATCH,
            runtime: {
              masterId: "instrument.runtime.master",
              transportControlId: "instrument.runtime.transportControl",
              masterFilterId: "instrument.runtime.masterFilter",
              globalDelayId: "instrument.runtime.globalDelay",
              globalReverbId: "instrument.runtime.globalReverb",
              masterVolumeId: "instrument.runtime.masterVolume",
              midiMapperId: "instrument.runtime.midiMapper",
              channelFilterIds: {},
              stepSequencerIds: {},
              navigation: {
                activeTrackIndex: 0,
                activePage: "sourceAmp",
                mode: "performance",
                shiftPressed: false,
                sequencerPageIndex: 0,
                selectedStepIndex: 0,
              },
            },
          },
          engine: {} as never,
          controllerSession: {} as never,
          getDisplayState: () => {
            throw new Error("Not needed for test");
          },
          dispose: () => undefined,
        } as unknown as StartedInstrumentSession);
      },
    });

    expect(calls).toEqual([
      "loadInstrument:instrument-1",
      `startInstrument:${document.name}`,
    ]);
  });

  it("forwards instrument session options to the instrument startup path", async () => {
    const device = new Device({
      token: "token-1",
      name: "Device",
      deploymentTarget: {
        kind: "instrument",
        instrumentId: "instrument-1",
      },
      userId: "user-1",
    });

    const document = createDefaultInstrumentDocument();
    const onDisplayStateChange = (_displayState: InstrumentDisplayState) =>
      undefined;
    let receivedDisplayHook:
      | ((displayState: InstrumentDisplayState) => void)
      | undefined;

    await startDeviceDeployment(device, {
      loadPatch: () =>
        Promise.reject(new Error("Patch path should not be used")),
      loadInstrument: () => Promise.resolve({ document }),
      loadEngine: () =>
        Promise.reject(new Error("Patch engine should not be used")),
      instrumentSessionOptions: {
        onDisplayStateChange,
      },
      startInstrumentSession: (_instrumentDocument, options) => {
        receivedDisplayHook = options?.onDisplayStateChange;
        return Promise.resolve({
          session: {} as never,
          engine: {} as never,
          controllerSession: {} as never,
          getDisplayState: () => {
            throw new Error("Not needed for test");
          },
          dispose: () => undefined,
        } as unknown as StartedInstrumentSession);
      },
    });

    expect(receivedDisplayHook).toBe(onDisplayStateChange);
  });

  it("autosaves Pi-side instrument document changes only to the local working copy", async () => {
    const device = new Device({
      token: "token-1",
      name: "Device",
      deploymentTarget: {
        kind: "instrument",
        instrumentId: "instrument-1",
      },
      userId: "user-1",
    });
    const document = createDefaultInstrumentDocument();
    const workingCopySaves: InstrumentDocument[] = [];
    const save = vi.fn().mockResolvedValue(undefined);
    let emitDocumentChange: StartInstrumentSessionOptions["onDocumentChange"];

    await startDeviceDeployment(device, {
      loadPatch: () =>
        Promise.reject(new Error("Patch path should not be used")),
      loadInstrument: () =>
        Promise.resolve({
          document,
          save,
        }),
      saveWorkingCopy: (_instrumentId, nextDocument) => {
        workingCopySaves.push(nextDocument);
      },
      loadEngine: () =>
        Promise.reject(new Error("Patch engine should not be used")),
      startInstrumentSession: (_instrumentDocument, options) => {
        emitDocumentChange = options?.onDocumentChange;

        return Promise.resolve({
          session: {} as never,
          engine: {} as never,
          controllerSession: {} as never,
          getDisplayState: () => {
            throw new Error("Not needed for test");
          },
          dispose: () => undefined,
        } as unknown as StartedInstrumentSession);
      },
    });

    if (!emitDocumentChange) {
      throw new Error(
        "Expected startDeviceDeployment to provide onDocumentChange",
      );
    }

    const nextDocument = {
      ...document,
      globalBlock: {
        ...document.globalBlock,
        masterVolume: 0.66,
      },
    };

    await emitDocumentChange(nextDocument, {} as never);
    await Promise.resolve();

    expect(workingCopySaves.at(-1)).toEqual(nextDocument);
    expect(save).not.toHaveBeenCalled();
  });

  it("caches the loaded instrument document as a working copy before the session starts", async () => {
    const device = new Device({
      token: "token-1",
      name: "Device",
      deploymentTarget: {
        kind: "instrument",
        instrumentId: "instrument-1",
      },
      userId: "user-1",
    });
    const document = createDefaultInstrumentDocument();
    const workingCopySaves: InstrumentDocument[] = [];

    await startDeviceDeployment(device, {
      loadPatch: () =>
        Promise.reject(new Error("Patch path should not be used")),
      loadInstrument: () =>
        Promise.resolve({
          document,
        }),
      saveWorkingCopy: (_instrumentId, nextDocument) => {
        workingCopySaves.push(nextDocument);
      },
      loadEngine: () =>
        Promise.reject(new Error("Patch engine should not be used")),
      startInstrumentSession: () =>
        Promise.resolve({
          session: {} as never,
          engine: {} as never,
          controllerSession: {} as never,
          getDisplayState: () => {
            throw new Error("Not needed for test");
          },
          dispose: () => undefined,
        } as unknown as StartedInstrumentSession),
    });

    expect(workingCopySaves).toEqual([document]);
  });

  it("saves the current local draft back to Firestore only after the explicit save command", async () => {
    const device = new Device({
      token: "token-1",
      name: "Device",
      deploymentTarget: {
        kind: "instrument",
        instrumentId: "instrument-1",
      },
      userId: "user-1",
    });
    const document = createDefaultInstrumentDocument();
    const save = vi.fn().mockResolvedValue(undefined);
    let persistAction: StartInstrumentSessionOptions["onPersistenceRequest"];

    await startDeviceDeployment(device, {
      loadPatch: () =>
        Promise.reject(new Error("Patch path should not be used")),
      loadInstrument: () =>
        Promise.resolve({
          document,
          save,
        }),
      saveWorkingCopy: () => undefined,
      loadEngine: () =>
        Promise.reject(new Error("Patch engine should not be used")),
      startInstrumentSession: (_instrumentDocument, options) => {
        persistAction = options?.onPersistenceRequest;

        return Promise.resolve({
          session: {} as never,
          engine: {} as never,
          controllerSession: {} as never,
          getDisplayState: () => {
            throw new Error("Not needed for test");
          },
          dispose: () => undefined,
        } as unknown as StartedInstrumentSession);
      },
    });

    if (!persistAction) {
      throw new Error(
        "Expected startDeviceDeployment to provide onPersistenceAction",
      );
    }

    const nextDocument = {
      ...document,
      globalBlock: {
        ...document.globalBlock,
        masterVolume: 0.66,
      },
    };

    const notice = await persistAction("saveDraft", nextDocument, {} as never);

    expect(save).toHaveBeenCalledTimes(1);
    expect(notice).toEqual({
      title: "SAVE COMPLETE",
      message: "Firestore updated",
      tone: "success",
    });
  });

  it("discards the local draft and restarts from Firestore after the explicit reload command", async () => {
    const device = new Device({
      token: "token-1",
      name: "Device",
      deploymentTarget: {
        kind: "instrument",
        instrumentId: "instrument-1",
      },
      userId: "user-1",
    });
    const workingDocument = createDefaultInstrumentDocument();
    const remoteDocument = {
      ...createDefaultInstrumentDocument(),
      name: "Remote Instrument",
    };
    const workingCopySaves: InstrumentDocument[] = [];
    let startCalls = 0;
    let persistAction: StartInstrumentSessionOptions["onPersistenceRequest"];
    const initialDisplayNotices: StartInstrumentSessionOptions["initialDisplayNotice"][] =
      [];

    await startDeviceDeployment(device, {
      loadPatch: () =>
        Promise.reject(new Error("Patch path should not be used")),
      loadInstrument: () =>
        Promise.resolve({
          document: remoteDocument,
          save: vi.fn().mockResolvedValue(undefined),
        }),
      loadWorkingCopy: () => workingDocument,
      saveWorkingCopy: (_instrumentId, nextDocument) => {
        workingCopySaves.push(nextDocument);
      },
      loadEngine: () =>
        Promise.reject(new Error("Patch engine should not be used")),
      startInstrumentSession: (instrumentDocument, options) => {
        startCalls += 1;
        initialDisplayNotices.push(options?.initialDisplayNotice);
        persistAction = options?.onPersistenceRequest;

        return Promise.resolve({
          session: {
            compiledInstrument: {
              name: instrumentDocument.name,
            },
          } as never,
          engine: {} as never,
          controllerSession: {} as never,
          getDisplayState: () => {
            throw new Error("Not needed for test");
          },
          dispose: () => undefined,
        } as unknown as StartedInstrumentSession);
      },
    });

    if (!persistAction) {
      throw new Error(
        "Expected startDeviceDeployment to provide onPersistenceAction",
      );
    }

    await persistAction("discardDraft", workingDocument, {} as never);

    expect(startCalls).toBe(2);
    expect(workingCopySaves.at(-1)).toEqual(remoteDocument);
    expect(initialDisplayNotices.at(-1)).toEqual({
      title: "REMOTE RELOADED",
      message: "Local draft discarded",
      tone: "success",
    });
  });

  it("fails clearly when the device has no deployment target", async () => {
    const device = new Device({
      token: "token-1",
      name: "Device",
      deploymentTarget: null,
      userId: "user-1",
    });

    await expect(
      startDeviceDeployment(device, {
        loadPatch: () => Promise.reject(new Error("Not expected")),
        loadInstrument: () => Promise.reject(new Error("Not expected")),
        loadEngine: () => Promise.reject(new Error("Not expected")),
        startInstrumentSession: (_document: InstrumentDocument) =>
          Promise.reject(new Error("Not expected")),
      }),
    ).rejects.toThrow("Device deployment target is not configured");
  });
});
