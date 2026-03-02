// @vitest-environment node
import { ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import {
  areModulesEqualIgnoringState,
  resolveModuleStateForType,
  selectModuleStateById,
} from "../../src/hooks";
import type { RootState } from "../../src/store";

const createSerializedModule = () =>
  ({
    id: "seq-1",
    name: "Step Sequencer",
    moduleType: ModuleType.StepSequencer,
    voiceNo: 0,
    props: { activePatternNo: 0 },
    inputs: [],
    outputs: [],
  }) as const;

describe("module state selectors", () => {
  it("treats runtime-only state changes as equal", () => {
    const base = createSerializedModule();
    const previous = { ...base, state: { currentStep: 0 } };
    const next = { ...base, state: { currentStep: 1 } };

    expect(areModulesEqualIgnoringState(previous, next)).toBe(true);
  });

  it("detects non-state changes", () => {
    const previous = {
      ...createSerializedModule(),
      props: { activePatternNo: 0 },
      state: { currentStep: 0 },
    };
    const next = {
      ...createSerializedModule(),
      props: { activePatternNo: 1 },
      state: { currentStep: 1 },
    };

    expect(areModulesEqualIgnoringState(previous, next)).toBe(false);
  });

  it("reads module runtime state by module id", () => {
    const rootState = {
      modules: {
        ids: ["seq-1"],
        entities: {
          "seq-1": {
            ...createSerializedModule(),
            state: { currentStep: 6, isRunning: true },
          },
        },
      },
    } as RootState;

    expect(selectModuleStateById(rootState, "seq-1")).toEqual({
      currentStep: 6,
      isRunning: true,
    });
    expect(selectModuleStateById(rootState, "missing-id")).toBeUndefined();
  });

  it("returns a stable fallback reference when runtime state is missing", () => {
    const moduleWithoutRuntimeState = createSerializedModule();

    const first = resolveModuleStateForType(
      moduleWithoutRuntimeState,
      ModuleType.StepSequencer,
    );
    const second = resolveModuleStateForType(
      moduleWithoutRuntimeState,
      ModuleType.StepSequencer,
    );

    expect(first).toBe(second);
  });

  it("returns a stable fallback reference for module type mismatch", () => {
    const stepSequencerModule = createSerializedModule();

    const first = resolveModuleStateForType(
      stepSequencerModule,
      ModuleType.Oscillator,
    );
    const second = resolveModuleStateForType(
      stepSequencerModule,
      ModuleType.Oscillator,
    );

    expect(first).toBe(second);
  });
});
