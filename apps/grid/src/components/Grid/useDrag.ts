import { useReactFlow } from "@xyflow/react";
import { DragEvent } from "react";
import { useAppDispatch } from "@/hooks";
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

    const type = event.dataTransfer.getData(
      "application/reactflow",
    ) as AvailableModuleType;
    const position = screenToFlowPosition({
      x: event.clientX - 20,
      y: event.clientY - 20,
    });

    dispatch(addNewModule({ type, position }));
  };

  return { onDragStart, onDrop, onDragOver };
}
