import { Button } from "@blibliki/ui";
import { PanelLeftClose, PanelLeftOpen, Blocks } from "lucide-react";
import { useState, DragEvent } from "react";
import { AvailableModules } from "@/components/AudioModule/modulesSlice";
import useDrag from "@/components/Grid/useDrag";

const SupportedModules = Object.values(AvailableModules)
  .map(({ moduleType }) => moduleType)
  .sort();

export default function AudioModules() {
  const [visible, setVisible] = useState<boolean>(true);
  const { onDragStart } = useDrag();

  const onClick = () => {
    setVisible(!visible);
  };
  const left = visible ? "0px" : "-189px";

  return (
    <div
      className="absolute z-10 top-12 w-[189px] h-[calc(100vh-3rem)] bg-slate-50 dark:bg-slate-900 border-r border-b border-slate-200 dark:border-slate-700 shadow-xl transition-all duration-300 ease-in-out flex flex-col"
      style={{ left }}
    >
      {/* Header Section */}
      <div className="flex items-center gap-2 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
        <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center shadow-sm">
          <Blocks className="w-3 h-3 text-white" />
        </div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight">
          Audio Modules
        </h2>
      </div>

      <Button
        variant="contained"
        color="neutral"
        className="absolute left-47.25 top-0 h-13 rounded-none rounded-r-md"
        onClick={onClick}
      >
        {visible ? (
          <PanelLeftClose className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        ) : (
          <PanelLeftOpen className="w-4 h-4 text-slate-600 dark:text-slate-300" />
        )}
      </Button>

      <nav className="flex-1 overflow-y-auto py-2">
        <ul className="px-3 space-y-1">
          {SupportedModules.map((moduleName) => (
            <li key={moduleName}>
              <Button
                color="neutral"
                size="md"
                className="w-full justify-start cursor-move group"
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
