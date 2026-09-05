// @vitest-environment node
import { ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import {
  bindableControls,
  controlLabel,
} from "../../src/video/bindableControls";

const modules = [
  { id: "spec1", name: "Spectrum", moduleType: ModuleType.Spectrum },
  { id: "osc1", name: "Osc", moduleType: ModuleType.Oscillator },
];

describe("bindableControls", () => {
  it("lists four bands per Spectrum module with a 0..1 range", () => {
    const controls = bindableControls(modules);
    const low = controls.find((c) => c.control === "spectrum:spec1:low");

    expect(low).toEqual({
      control: "spectrum:spec1:low",
      label: "Spectrum · low",
      group: "Spectrum",
      min: 0,
      max: 1,
    });
    expect(controls.filter((c) => c.group === "Spectrum")).toHaveLength(4);
  });

  it("lists bounded numeric props of audio modules with their schema range", () => {
    const controls = bindableControls(modules);
    const frequency = controls.find(
      (c) => c.control === "patch:osc1:frequency",
    );

    expect(frequency?.group).toBe("Audio");
    expect(frequency?.label).toBe("Osc · Frequency");
    expect(frequency?.min).toBeLessThan(frequency?.max ?? 0);
  });

  it("carries the schema's exp so bindings follow the slider curve", () => {
    const controls = bindableControls([
      { id: "f1", name: "Filter", moduleType: ModuleType.Filter },
    ]);
    const cutoff = controls.find((c) => c.control === "patch:f1:cutoff");

    expect(cutoff?.exp).toBe(5);
    expect(
      controls.find((c) => c.control === "spectrum:spec1:low"),
    ).toBeUndefined();
  });

  it("labels an unknown control by its raw name", () => {
    expect(controlLabel(bindableControls(modules), "patch:gone:x")).toBe(
      "patch:gone:x",
    );
  });
});
