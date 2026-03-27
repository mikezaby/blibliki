import { Engine, type IEngineSerialize } from "@blibliki/engine";
import type { InstrumentDocument } from "@blibliki/instrument";
import {
  Device,
  Instrument,
  Patch,
  normalizeDeviceDeploymentTarget,
} from "@blibliki/models";
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
  document: Record<string, unknown>;
};

type PatchEngine = {
  start: () => Promise<void> | void;
};

export type DeviceDeploymentDependencies = {
  loadPatch?: (patchId: string) => Promise<LoadablePatch>;
  loadInstrument?: (instrumentId: string) => Promise<LoadableInstrument>;
  loadEngine?: (patch: IEngineSerialize) => Promise<PatchEngine>;
  startInstrumentSession?: typeof startInstrumentSession;
  instrumentSessionOptions?: Pick<
    StartInstrumentSessionOptions,
    "onDisplayStateChange" | "onRuntimePatchChange"
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

  const instrument = await (dependencies.loadInstrument ?? Instrument.find)(
    deploymentTarget.instrumentId,
  );
  const startedSession = await (
    dependencies.startInstrumentSession ?? startInstrumentSession
  )(
    instrument.document as InstrumentDocument,
    dependencies.instrumentSessionOptions,
  );

  return {
    kind: "instrument",
    startedSession,
  };
}
