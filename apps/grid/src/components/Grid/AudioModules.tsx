import { Button, Divider, IconButton, Stack, Surface } from "@blibliki/ui";
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

  return (
    <Surface
      tone="panel"
      border="subtle"
      radius="none"
      shadow="xl"
      asChild
      className={`absolute top-12 left-0 z-10 h-[calc(100vh-3rem)] w-47.25 border-r border-b transition-transform duration-300 ease-in-out ${
        visible ? "translate-x-0" : "-translate-x-[189px]"
      }`}
    >
      <aside>
        <Stack direction="row" align="center" gap={2} className="p-4">
          <div className="w-5 h-5 bg-linear-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center shadow-sm">
            <Blocks className="w-3 h-3 text-white" />
          </div>
          <h2 className="text-sm font-semibold">Audio Modules</h2>
        </Stack>
        <Divider />

        <IconButton
          aria-label={"Expand/Collapse audio modules panel"}
          icon={
            visible ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )
          }
          variant="contained"
          color="neutral"
          className="absolute left-47.25 top-0 h-13 w-13 rounded-none rounded-br-md"
          onClick={onClick}
        />

        <nav className="flex-1 overflow-y-auto py-2">
          <ul className="px-3 space-y-1">
            {SupportedModules.map((moduleName) => (
              <li key={moduleName}>
                <Button
                  color="neutral"
                  variant="contained"
                  size="md"
                  className="w-full cursor-move justify-start"
                  onDragStart={(event: DragEvent) => {
                    onDragStart(event, moduleName);
                  }}
                  draggable
                >
                  <Stack direction="row" align="center" gap={2}>
                    <div className="w-2 h-2 bg-linear-to-br from-blue-500 to-purple-600 rounded-full group-hover:scale-110 transition-transform duration-200" />
                    <span>{moduleName}</span>
                  </Stack>
                </Button>
              </li>
            ))}
          </ul>

          <div className="px-3 pt-4 pb-2">
            <p className="text-xs text-content-muted italic">
              Drag modules to the grid to add them
            </p>
          </div>
        </nav>
      </aside>
    </Surface>
  );
}
