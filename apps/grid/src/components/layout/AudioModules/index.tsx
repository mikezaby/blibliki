"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useState, DragEvent } from "react";
import { AvailableModules } from "@/components/AudioModule/modulesSlice";
import useDrag from "@/components/Grid/useDrag";
import { Button } from "@/components/ui";

export default function AudioModules() {
  const [visible, setVisible] = useState<boolean>(true);
  const { onDragStart } = useDrag();

  const onClick = () => {
    setVisible(!visible);
  };
  const left = visible ? "0px" : "-150px";

  return (
    <div
      className="absolute z-10 top-[58px] w-[150px] border-b border-r bg-gray-50 dark:bg-gray-800"
      style={{ left }}
    >
      <Button
        variant="ghost"
        className="absolute left-[150px] border-b border-r bg-gray-50 dark:bg-gray-800"
        onClick={onClick}
      >
        {visible ? <PanelLeftClose /> : <PanelLeftOpen />}
      </Button>
      <nav className="flex-1 overflow-y-auto pt-4 pb-4">
        <ul className="px-2">
          {Object.keys(AvailableModules).map((moduleName) => (
            <li key={moduleName} className="mb-1">
              <Button
                variant="outline"
                className="w-full cursor-move"
                onDragStart={(event: DragEvent) => {
                  onDragStart(event, moduleName);
                }}
                draggable
              >
                {moduleName}
              </Button>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
