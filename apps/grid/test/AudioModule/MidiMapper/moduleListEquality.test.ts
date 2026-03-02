// @vitest-environment node
import { ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { areModulesEqualForMidiMapper } from "../../../src/components/AudioModule/MidiMapper.utils";
import type { ModuleProps } from "../../../src/components/AudioModule/modulesSlice";

type MinimalModule = {
  id: string;
  name: string;
  moduleType: ModuleType;
  props: object;
  state?: object;
};

const createModule = (
  overrides: Partial<MinimalModule> = {},
): MinimalModule => ({
  id: "osc-1",
  name: "Osc 1",
  moduleType: ModuleType.Oscillator,
  props: { frequency: 440 },
  state: { currentStep: 0 },
  ...overrides,
});

describe("areModulesEqualForMidiMapper", () => {
  it("treats lists as equal when only props/state changed", () => {
    const previous = [createModule()];
    const next = [
      createModule({
        props: { frequency: 880 },
        state: { currentStep: 12 },
      }),
    ];

    expect(
      areModulesEqualForMidiMapper(
        previous as unknown as ModuleProps[],
        next as unknown as ModuleProps[],
      ),
    ).toBe(true);
  });

  it("detects name changes", () => {
    const previous = [createModule()];
    const next = [createModule({ name: "Osc Renamed" })];

    expect(
      areModulesEqualForMidiMapper(
        previous as unknown as ModuleProps[],
        next as unknown as ModuleProps[],
      ),
    ).toBe(false);
  });
});
