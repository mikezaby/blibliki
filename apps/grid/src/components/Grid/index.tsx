import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useOnViewportChange,
  Viewport,
  useReactFlow,
} from "@xyflow/react";
import { useEffect } from "react";
import { useAppDispatch, useGridNodes, usePatch } from "@/hooks";
import { NodeTypes } from "./AudioNode";
import { setViewport } from "./gridNodesSlice";
import useDrag from "./useDrag";

const DEFAULT_REACT_FLOW_PROPS = {
  hideAttribution: true,
};

export default function Grid() {
  const {
    nodes,
    edges,
    viewport,
    onNodesChange,
    onEdgesChange,
    onConnect,
    isValidConnection,
  } = useGridNodes();
  const { onDrop, onDragOver } = useDrag();

  return (
    <div className="grid-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={NodeTypes}
        minZoom={0.3}
        onDrop={onDrop}
        onDragOver={onDragOver}
        isValidConnection={isValidConnection}
        proOptions={DEFAULT_REACT_FLOW_PROPS}
      >
        <Controls className="dark:bg-gray-500" />
        <MiniMap className="dark:bg-gray-700" />
        <Background
          className="dark:bg-gray-700"
          variant={BackgroundVariant.Dots}
          gap={12}
          size={1}
        />
        <OnViewportChange viewport={viewport} />
      </ReactFlow>
    </div>
  );
}

function OnViewportChange({ viewport }: { viewport: Viewport }) {
  const dispatch = useAppDispatch();
  const { patch } = usePatch();
  const { setViewport: setInitialViewport } = useReactFlow();

  useOnViewportChange({
    onEnd: (viewport: Viewport) => dispatch(setViewport(viewport)),
  });

  // Set the initial viewport from saved patch
  useEffect(() => {
    if (!patch.id) return;

    void setInitialViewport(viewport);
  }, [viewport, setInitialViewport, patch.id]);

  return null;
}
