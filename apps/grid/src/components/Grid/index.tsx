import { Surface } from "@blibliki/ui";
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  XYPosition,
  useOnViewportChange,
  Viewport,
  useReactFlow,
} from "@xyflow/react";
import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useEffectEvent,
  useRef,
  type ReactNode,
} from "react";
import { useAppDispatch, useGridNodes, usePatch } from "@/hooks";
import { store } from "@/store";
import {
  GRID_CANVAS_BACKGROUND,
  GRID_CANVAS_PATTERN,
} from "@/theme/gridCanvas";
import AudioModules from "./AudioModules";
import { NodeTypes } from "./AudioNode";
import {
  buildGridClipboardSnapshot,
  pasteGridClipboardSnapshot,
  readGridClipboardSnapshotFromDataTransfer,
  writeGridClipboardSnapshotToDataTransfer,
} from "./clipboard";
import { shouldHandleGridClipboardTarget } from "./gridClipboardShortcut";
import { setViewport } from "./gridNodesSlice";
import useDrag from "./useDrag";

const DEFAULT_REACT_FLOW_PROPS = {
  hideAttribution: true,
};

export default function Grid({ children }: { children?: ReactNode }) {
  const { screenToFlowPosition } = useReactFlow();
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
  const dispatch = useAppDispatch();
  const lastPointerPositionRef = useRef<XYPosition | null>(null);
  const pasteIterationRef = useRef(0);

  const handleWindowCopy = useEffectEvent((event: ClipboardEvent) => {
    if (!shouldHandleGridClipboardTarget(event.target)) return;
    if (!event.clipboardData) return;

    const snapshot = buildGridClipboardSnapshot(store.getState());
    if (!snapshot) return;

    event.preventDefault();
    writeGridClipboardSnapshotToDataTransfer(event.clipboardData, snapshot);
    pasteIterationRef.current = 0;
  });

  const handleWindowPaste = useEffectEvent((event: ClipboardEvent) => {
    if (!shouldHandleGridClipboardTarget(event.target)) return;
    if (!event.clipboardData) return;

    const snapshot = readGridClipboardSnapshotFromDataTransfer(
      event.clipboardData,
    );
    if (!snapshot) return;

    event.preventDefault();
    pasteIterationRef.current += 1;
    dispatch(
      pasteGridClipboardSnapshot(snapshot, {
        anchorPosition: lastPointerPositionRef.current ?? undefined,
        pasteIteration: pasteIterationRef.current,
      }),
    );
  });

  const handleCanvasMouseMove = (event: ReactMouseEvent) => {
    lastPointerPositionRef.current = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
  };

  const handleCanvasMouseLeave = () => {
    lastPointerPositionRef.current = null;
  };

  useEffect(() => {
    window.addEventListener("copy", handleWindowCopy);
    window.addEventListener("paste", handleWindowPaste);

    return () => {
      window.removeEventListener("copy", handleWindowCopy);
      window.removeEventListener("paste", handleWindowPaste);
    };
  }, []);

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
          onPaneMouseMove={handleCanvasMouseMove}
          onPaneMouseLeave={handleCanvasMouseLeave}
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
          {children}
        </ReactFlow>
      </div>
    </Surface>
  );
}

function OnViewportChange({ viewport }: { viewport: Viewport }) {
  const dispatch = useAppDispatch();
  const { patch } = usePatch();
  const { setViewport: setInitialViewport } = useReactFlow();

  useOnViewportChange({
    onEnd: (viewport: Viewport) => dispatch(setViewport(viewport)),
  });

  const restoreInitialViewport = useEffectEvent(() => {
    void setInitialViewport(viewport);
  });

  useEffect(() => {
    restoreInitialViewport();
  }, [patch.id]);

  return null;
}
