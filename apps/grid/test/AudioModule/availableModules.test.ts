// @vitest-environment node
import { ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import { AvailableModules } from "../../src/components/AudioModule/modulesSlice";

describe("AvailableModules", () => {
  it("includes transport control in the grid module registry", () => {
    expect(AvailableModules[ModuleType.TransportControl]).toEqual({
      name: "Transport Control",
      moduleType: ModuleType.TransportControl,
    });
  });

  it("includes drum machine in the grid module registry", () => {
    expect(AvailableModules[ModuleType.DrumMachine]).toEqual({
      name: "Drum Machine",
      moduleType: ModuleType.DrumMachine,
    });
  });
});
