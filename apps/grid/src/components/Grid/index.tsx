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
import { useEffect, useMemo } from "react";
import {
  ColorScheme,
  useAppDispatch,
  useColorScheme,
  useGridNodes,
  usePatch,
} from "@/hooks";
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

  const { colorScheme } = useColorScheme();
  const isDarkMode = colorScheme === ColorScheme.Dark;

  console.log(isDarkMode);

  return (
    <div className="grid-container h-full bg-slate-200 dark:bg-slate-600">
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
        <Controls className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg" />
        <MiniMap
          style={{
            backgroundColor: isDarkMode ? "#1e293b" : "#ffffff",
            border: `1px solid ${isDarkMode ? "#334155" : "#e2e8f0"}`,
            borderRadius: "0.5rem",
            overflow: "hidden",
            boxShadow:
              "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
          }}
          nodeColor={(node) => {
            return node.selected ? "#3b82f6" : "#64748b";
          }}
          nodeStrokeColor={(node) => {
            return node.selected ? "#1e40af" : "#475569";
          }}
          maskColor={
            isDarkMode ? "rgb(241 245 249 / 0.1)" : "rgb(148 163 184 / 0.1)"
          }
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
