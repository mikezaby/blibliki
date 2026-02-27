// @vitest-environment node
import { describe, expect, it } from "vitest";
import { assertPatchPayloadHasNoUndefined } from "../../src/patch/patchPayloadValidation";

describe("assertPatchPayloadHasNoUndefined", () => {
  it("reports exact module prop path and module metadata", () => {
    const payload = {
      name: "Broken Patch",
      userId: "user-1",
      config: {
        bpm: 120,
        modules: [
          {
            id: "osc-1",
            moduleType: "Oscillator",
            name: "Osc 1",
            props: { detune: undefined },
          },
        ],
        gridNodes: {
          nodes: [],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
    };

    expect(() =>
      assertPatchPayloadHasNoUndefined(payload, {
        documentPath: "patches/patch-1",
      }),
    ).toThrowError(
      /config\.modules\[0\]\.props\.detune.*moduleId=osc-1.*moduleType=Oscillator.*name=Osc 1/s,
    );
  });

  it("reports exact grid edge path and edge metadata", () => {
    const payload = {
      name: "Broken Patch",
      userId: "user-1",
      config: {
        bpm: 120,
        modules: [],
        gridNodes: {
          nodes: [],
          edges: [
            {
              id: "edge-1",
              source: "osc-1",
              target: "gain-1",
              sourceHandle: undefined,
            },
          ],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
    };

    expect(() =>
      assertPatchPayloadHasNoUndefined(payload, {
        documentPath: "patches/patch-1",
      }),
    ).toThrowError(
      /config\.gridNodes\.edges\[0\]\.sourceHandle.*edgeId=edge-1.*source=osc-1.*target=gain-1/s,
    );
  });

  it("does not throw for valid payloads", () => {
    const payload = {
      name: "Valid Patch",
      userId: "user-1",
      config: {
        bpm: 120,
        modules: [
          {
            id: "osc-1",
            moduleType: "Oscillator",
            name: "Osc 1",
            props: { detune: 0 },
          },
        ],
        gridNodes: {
          nodes: [],
          edges: [
            {
              id: "edge-1",
              source: "osc-1",
              target: "gain-1",
              sourceHandle: null,
            },
          ],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
    };

    expect(() =>
      assertPatchPayloadHasNoUndefined(payload, {
        documentPath: "patches/patch-1",
      }),
    ).not.toThrow();
  });
});
