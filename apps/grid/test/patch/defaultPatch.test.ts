// @vitest-environment node
import { ModuleType } from "@blibliki/engine";
import { Patch } from "@blibliki/models";
import { describe, expect, it } from "vitest";
import { defaultPatch } from "../../src/patch/defaultPatch";

describe("the default patch", () => {
  const patch = Patch.build(defaultPatch);
  const { modules, gridNodes } = patch.config;
  const moduleIds = new Set(modules.map((module) => module.id));

  it("builds without an id, so saving it writes a new patch", () => {
    expect(patch.id).toBe("");
    expect(patch.userId).toBe("");
  });

  it("survives the merge with the model defaults", () => {
    expect(modules.length).toBeGreaterThan(0);
    expect(patch.config.bpm).toBeGreaterThan(0);
    expect(gridNodes.nodes).toHaveLength(modules.length);
  });

  it("gives every grid node a module", () => {
    gridNodes.nodes.forEach((node) => {
      expect(moduleIds, `node ${node.id}`).toContain(node.id);
    });
  });

  it("wires every edge between real modules, on named handles", () => {
    expect(gridNodes.edges.length).toBeGreaterThan(0);

    gridNodes.edges.forEach((edge) => {
      expect(moduleIds, `edge ${edge.id} source`).toContain(edge.source);
      expect(moduleIds, `edge ${edge.id} target`).toContain(edge.target);
      expect(edge.sourceHandle, `edge ${edge.id} sourceHandle`).toBeTruthy();
      expect(edge.targetHandle, `edge ${edge.id} targetHandle`).toBeTruthy();
    });
  });

  it("reaches the master", () => {
    const master = modules.find(
      (module) => module.moduleType === ModuleType.Master,
    );

    expect(master).toBeDefined();
    expect(gridNodes.edges.some((edge) => edge.target === master!.id)).toBe(
      true,
    );
  });

  it("schedules voices for every polyphonic module", () => {
    const scheduler = modules.find(
      (module) => module.moduleType === ModuleType.VoiceScheduler,
    );

    expect(scheduler).toBeDefined();
    expect(gridNodes.edges.some((edge) => edge.source === scheduler!.id)).toBe(
      true,
    );
  });
});
