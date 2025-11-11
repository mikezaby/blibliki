"use client";

import { PanelLeftClose, PanelLeftOpen, Blocks } from "lucide-react";
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
  const left = visible ? "0px" : "-189px";

  return (
    <div
      className="absolute z-10 top-12 w-[189px] bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 border-r border-b border-slate-200 dark:border-slate-700 shadow-xl transition-all duration-300 ease-in-out"
      style={{ left }}
    >
      {/* Header Section */}
      <div className="flex items-center gap-2 p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900">
        <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center shadow-sm">
          <Blocks className="w-3 h-3 text-white" />
        </div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
          Audio Modules
        </h2>
      </div>

      <Button
        variant="ghost"
        className="absolute left-[189px] top-0 h-13 rounded-none rounded-r-md border-r border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-lg hover:from-slate-200 hover:to-slate-100 dark:hover:from-slate-700 dark:hover:to-slate-800 transition-all duration-200"
        onClick={onClick}
      >
        {visible ? (
          <PanelLeftClose className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        ) : (
          <PanelLeftOpen className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        )}
      </Button>

      <nav className="flex-1 overflow-y-auto py-2 max-h-[calc(100vh-8rem)]">
        <div className="px-3 py-2">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wide mb-3">
            Available Modules
          </p>
        </div>
        <ul className="px-3 space-y-1">
          {Object.keys(AvailableModules).map((moduleName) => (
            <li key={moduleName}>
              <Button
                variant="ghost"
                className="w-full justify-start cursor-move h-9 px-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/30 shadow-sm hover:shadow-md transition-all duration-200 group"
                onDragStart={(event: DragEvent) => {
                  onDragStart(event, moduleName);
                }}
                draggable
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="w-2 h-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full group-hover:scale-110 transition-transform duration-200" />
                  <span className="truncate">{moduleName}</span>
                </div>
              </Button>
            </li>
          ))}
        </ul>

        {/* Footer hint */}
        <div className="px-3 pt-4 pb-2">
          <p className="text-xs text-slate-400 dark:text-slate-500 italic">
            Drag modules to the grid to add them
          </p>
        </div>
      </nav>
    </div>
  );
}
