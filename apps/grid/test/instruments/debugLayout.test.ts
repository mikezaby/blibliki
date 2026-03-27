// @vitest-environment node
import type { Edge, Node } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import { layoutDebugNodes } from "../../src/instruments/debugLayout";

describe("layoutDebugNodes", () => {
  it("spaces horizontal dagre ranks using measured node sizes", () => {
    const nodes: Node[] = [
      {
        id: "source",
        type: "audioNode",
        data: {},
        position: { x: 0, y: 0 },
        measured: { width: 520, height: 180 },
      },
      {
        id: "mapper",
        type: "audioNode",
        data: {},
        position: { x: 0, y: 48 },
        measured: { width: 620, height: 240 },
      },
      {
        id: "master",
        type: "audioNode",
        data: {},
        position: { x: 0, y: 96 },
        measured: { width: 360, height: 180 },
      },
    ];
    const edges: Edge[] = [
      { id: "route-1", source: "source", target: "mapper" },
      { id: "route-2", source: "mapper", target: "master" },
    ];

    const laidOutNodes = layoutDebugNodes(nodes, edges);
    const sourceNode = laidOutNodes.find((node) => node.id === "source");
    const mapperNode = laidOutNodes.find((node) => node.id === "mapper");
    const masterNode = laidOutNodes.find((node) => node.id === "master");

    expect(sourceNode).toBeDefined();
    expect(mapperNode).toBeDefined();
    expect(masterNode).toBeDefined();
    expect(mapperNode!.position.x).toBeGreaterThanOrEqual(
      sourceNode!.position.x + 520,
    );
    expect(masterNode!.position.x).toBeGreaterThanOrEqual(
      mapperNode!.position.x + 620,
    );
  });
});
