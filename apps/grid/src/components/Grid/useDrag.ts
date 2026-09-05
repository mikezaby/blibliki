import { VideoModuleType } from "@blibliki/video-engine";
import { useReactFlow } from "@xyflow/react";
import { DragEvent } from "react";
import { useAppDispatch } from "@/hooks";
import { addNewVideoModule } from "@/video/videoPatchSlice";
import { addNewModule, AvailableModuleType } from "../AudioModule/modulesSlice";

function onDragStart(event: DragEvent, nodeType: string) {
  event.dataTransfer.setData("application/reactflow", nodeType);
  event.dataTransfer.effectAllowed = "move";
}

function onDragOver(event: DragEvent) {
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

export default function useDrag() {
  const dispatch = useAppDispatch();
  const { screenToFlowPosition } = useReactFlow();

  const onDrop = (event: DragEvent) => {
    event.preventDefault();

    const raw = event.dataTransfer.getData("application/reactflow");
    const position = screenToFlowPosition({
      x: event.clientX - 20,
      y: event.clientY - 20,
    });

    if (raw.startsWith("video:")) {
      const type = raw.slice("video:".length) as VideoModuleType;
      dispatch(addNewVideoModule({ type, position }));
      return;
    }

    const type = raw as AvailableModuleType;
    dispatch(addNewModule({ type, position }));
  };

  return { onDragStart, onDrop, onDragOver };
}
