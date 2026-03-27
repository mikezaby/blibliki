import { requestAnimationFrame } from "@blibliki/utils";
import { useNodesInitialized, useReactFlow } from "@xyflow/react";
import { useEffect, useRef } from "react";
import { setNodes } from "@/components/Grid/gridNodesSlice";
import { useAppDispatch, useGridNodes } from "@/hooks";
import { layoutDebugNodes } from "./debugLayout";

export default function InstrumentDebugAutoLayout() {
  const dispatch = useAppDispatch();
  const { nodes, edges } = useGridNodes();
  const { getNodes, fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const appliedLayoutKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!nodesInitialized || nodes.length === 0) return;

    const layoutKey = `${nodes.map((node) => node.id).join("|")}::${edges
      .map((edge) => edge.id)
      .join("|")}`;
    const measuredNodes = getNodes();
    const laidOutNodes = layoutDebugNodes(measuredNodes, edges);
    const measuredNodesById = new Map(
      measuredNodes.map((node) => [node.id, node.position]),
    );
    const positionsChanged = laidOutNodes.some((node) => {
      const currentPosition = measuredNodesById.get(node.id);
      if (!currentPosition) return false;

      return (
        currentPosition.x !== node.position.x ||
        currentPosition.y !== node.position.y
      );
    });

    if (appliedLayoutKeyRef.current === layoutKey && !positionsChanged) return;

    dispatch(setNodes(laidOutNodes));
    appliedLayoutKeyRef.current = layoutKey;
    requestAnimationFrame(() => {
      void fitView({ padding: 0.15, duration: 0 });
    });
  }, [dispatch, edges, fitView, getNodes, nodes, nodesInitialized]);

  return null;
}
