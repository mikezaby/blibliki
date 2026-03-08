// @vitest-environment node
import { Patch } from "@blibliki/models";
import { describe, expect, it } from "vitest";

describe("Patch.build", () => {
  it("creates a patch with bootstrap defaults", () => {
    const patch = Patch.build();

    expect(patch.id).toBe("");
    expect(patch.name).toBe("Init patch");
    expect(patch.userId).toBe("");
    expect(patch.config.bpm).toBe(120);
    expect(patch.config.modules).toEqual([]);
    expect(patch.config.gridNodes).toEqual({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    });
  });

  it("applies provided values", () => {
    const patch = Patch.build({
      name: "My patch",
      userId: "user-1",
      config: {
        bpm: 90,
        modules: [],
        gridNodes: {
          nodes: [],
          edges: [],
          viewport: { x: 8, y: 16, zoom: 1.5 },
        },
      },
    });

    expect(patch.id).toBe("");
    expect(patch.name).toBe("My patch");
    expect(patch.userId).toBe("user-1");
    expect(patch.config.bpm).toBe(90);
    expect(patch.config.modules).toEqual([]);
    expect(patch.config.gridNodes.viewport).toEqual({ x: 8, y: 16, zoom: 1.5 });
  });

  it("fills nested defaults when partial nested config is provided", () => {
    const patch = Patch.build({
      config: {
        gridNodes: {
          viewport: { x: 42 } as never,
        } as never,
      } as never,
    });

    expect(patch.config.modules).toEqual([]);
    expect(patch.config.gridNodes.nodes).toEqual([]);
    expect(patch.config.gridNodes.edges).toEqual([]);
    expect(patch.config.gridNodes.viewport).toEqual({ x: 42, y: 0, zoom: 1 });
  });
});
