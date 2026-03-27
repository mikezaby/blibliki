import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";

const DEFAULT_NODE_WIDTH = 280;
const DEFAULT_NODE_HEIGHT = 180;
const NODE_GAP = 90;
const RANK_GAP = 200;
const START_X = 120;
const START_Y = 120;

function getNodeSize(node: Node) {
  return {
    width: node.measured?.width ?? node.width ?? DEFAULT_NODE_WIDTH,
    height: node.measured?.height ?? node.height ?? DEFAULT_NODE_HEIGHT,
  };
}

export function layoutDebugNodes(
  nodes: readonly Node[],
  edges: readonly Edge[],
) {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({
    rankdir: "LR",
    ranksep: RANK_GAP,
    nodesep: NODE_GAP,
    marginx: START_X,
    marginy: START_Y,
  });

  const nodeSizes = new Map<string, ReturnType<typeof getNodeSize>>();

  for (const node of [...nodes].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    const size = getNodeSize(node);
    nodeSizes.set(node.id, size);
    graph.setNode(node.id, size);
  }

  for (const edge of [...edges].sort((left, right) =>
    left.id.localeCompare(right.id),
  )) {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target)) {
      graph.setEdge(edge.source, edge.target);
    }
  }

  dagre.layout(graph);

  return nodes.map((node) => {
    const graphNode = graph.node(node.id) as
      | { x: number; y: number }
      | undefined;
    const size = nodeSizes.get(node.id) ?? {
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    };

    return {
      ...node,
      position: graphNode
        ? {
            x: graphNode.x - size.width / 2,
            y: graphNode.y - size.height / 2,
          }
        : node.position,
    };
  });
}
