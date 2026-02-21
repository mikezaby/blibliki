import { Surface } from "@blibliki/ui";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useOnViewportChange,
  Viewport,
  useReactFlow,
} from "@xyflow/react";
import { useEffect, useRef } from "react";
import { useAppDispatch, useGridNodes, usePatch } from "@/hooks";
import {
  GRID_CANVAS_BACKGROUND,
  GRID_CANVAS_PATTERN,
} from "@/theme/gridCanvas";
import AudioModules from "./AudioModules";
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
    <Surface
      tone="canvas"
      radius="none"
      asChild
      className="grid-container h-full"
    >
      <div>
        <AudioModules />
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
          <Controls position="bottom-right" className="grid-controls" />
          <Background
            variant={BackgroundVariant.Dots}
            gap={16}
            size={1.2}
            bgColor={GRID_CANVAS_BACKGROUND}
            color={GRID_CANVAS_PATTERN}
          />
          <OnViewportChange viewport={viewport} />
        </ReactFlow>
      </div>
    </Surface>
  );
}

function OnViewportChange({ viewport }: { viewport: Viewport }) {
  const dispatch = useAppDispatch();
  const lastPatchIdRef = useRef<string | null>(null);
  const { patch } = usePatch();
  const { setViewport: setInitialViewport } = useReactFlow();

  useOnViewportChange({
    onEnd: (viewport: Viewport) => dispatch(setViewport(viewport)),
  });

  // Set the initial viewport from saved patch
  useEffect(() => {
    if (!patch.id) return;

    if (lastPatchIdRef.current !== patch.id) {
      lastPatchIdRef.current = patch.id;
      void setInitialViewport(viewport);
    }
  }, [viewport, setInitialViewport, patch.id]);

  return null;
}
