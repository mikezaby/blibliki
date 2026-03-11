import {
  Button,
  Divider,
  IconButton,
  Stack,
  Surface,
  Text,
} from "@blibliki/ui";
import { PanelLeftClose, PanelLeftOpen, Blocks } from "lucide-react";
import { useState, DragEvent } from "react";
import { AvailableModules } from "@/components/AudioModule/modulesSlice";
import useDrag from "@/components/Grid/useDrag";

const SupportedModules = Object.values(AvailableModules)
  .map(({ moduleType }) => moduleType)
  .sort();

const COMPACT_VIEWPORT_MEDIA_QUERY = "(max-width: 767px)";

type PanelState = "auto" | "open" | "closed";

const isCompactViewport = () => {
  if (typeof window === "undefined") return false;

  return window.matchMedia(COMPACT_VIEWPORT_MEDIA_QUERY).matches;
};

export default function AudioModules() {
  const [panelState, setPanelState] = useState<PanelState>("auto");
  const { onDragStart } = useDrag();

  const visible =
    panelState === "open" || (panelState === "auto" && !isCompactViewport());

  const onClick = () => {
    setPanelState((currentState) => {
      const currentVisibility =
        currentState === "open" ||
        (currentState === "auto" && !isCompactViewport());

      return currentVisibility ? "closed" : "open";
    });
  };

  return (
    <Surface
      tone="panel"
      border="subtle"
      radius="none"
      shadow="xl"
      asChild
      className="audio-modules-panel"
      data-panel-state={panelState}
    >
      <aside>
        <Stack direction="row" align="center" gap={2} className="p-4">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-linear-to-br from-brand to-brand-secondary shadow-sm">
            <Blocks className="w-3 h-3 text-brand-contrast" />
          </div>
          <Text asChild size="sm" weight="semibold">
            <h2>Audio Modules</h2>
          </Text>
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
          className="audio-modules-panel-toggle rounded-none rounded-br-md"
          onClick={onClick}
        />

        <nav className="min-h-0 flex-1 overflow-y-auto py-2">
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
                    <div className="h-2 w-2 rounded-full bg-linear-to-br from-brand to-brand-secondary transition-transform duration-200 group-hover:scale-110" />
                    <span>{moduleName}</span>
                  </Stack>
                </Button>
              </li>
            ))}
          </ul>

          <div className="px-3 pt-4 pb-2">
            <Text asChild tone="muted" size="xs" className="italic">
              <p>Drag modules to the grid to add them</p>
            </Text>
          </div>
        </nav>
      </aside>
    </Surface>
  );
}
