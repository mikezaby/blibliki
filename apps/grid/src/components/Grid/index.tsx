import {
  ReactFlow,
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
    <div className="grid-container h-full bg-slate-200 dark:bg-slate-600">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={NodeTypes}
        minZoom={0.1}
        onDrop={onDrop}
        onDragOver={onDragOver}
        isValidConnection={isValidConnection}
        proOptions={DEFAULT_REACT_FLOW_PROPS}
      >
        <Controls
          position="bottom-right"
          className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1.2} />
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
