import { Resolution, PlaybackMode } from "@blibliki/engine";
import {
  Button,
  Divider,
  Label,
  Select,
  SelectContent,
  SelectItem,
  Stack,
  Surface,
  SelectTrigger,
  SelectValue,
} from "@blibliki/ui";

type ControlsProps = {
  stepsPerPage: number;
  resolution: Resolution;
  playbackMode: PlaybackMode;
  isRunning: boolean;
  onStepsChange: (value: number) => void;
  onResolutionChange: (value: Resolution) => void;
  onPlaybackModeChange: (value: PlaybackMode) => void;
  onStart: () => void;
  onStop: () => void;
};

const STEP_OPTIONS = [4, 8, 12, 16] as const;
const RESOLUTION_OPTIONS = [
  { value: Resolution.thirtysecond, label: "1/32" },
  { value: Resolution.sixteenth, label: "1/16" },
  { value: Resolution.eighth, label: "1/8" },
  { value: Resolution.quarter, label: "1/4" },
] as const;
const PLAYBACK_MODE_OPTIONS = [
  { value: PlaybackMode.loop, label: "Loop" },
  { value: PlaybackMode.oneShot, label: "One-Shot" },
] as const;

export default function Controls({
  stepsPerPage,
  resolution,
  playbackMode,
  isRunning,
  onStepsChange,
  onResolutionChange,
  onPlaybackModeChange,
  onStart,
  onStop,
}: ControlsProps) {
  return (
    <Surface tone="subtle" border="subtle" radius="md" className="p-3">
      <Stack direction="row" align="center" gap={4} className="flex-wrap">
        <Stack direction="row" gap={2}>
          <Button
            color={isRunning ? "error" : "success"}
            size="sm"
            className="w-15"
            onClick={isRunning ? onStop : onStart}
          >
            {isRunning ? "Stop" : "Start"}
          </Button>
        </Stack>

        <Divider orientation="vertical" className="h-6" />

        <Stack direction="row" align="center" gap={2}>
          <Label className="text-xs font-medium">Steps:</Label>
          <Select
            value={stepsPerPage.toString()}
            onValueChange={(nextValue) => {
              onStepsChange(Number(nextValue));
            }}
          >
            <SelectTrigger size="sm" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STEP_OPTIONS.map((num) => (
                <SelectItem key={num} value={num.toString()}>
                  {num}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Stack>

        <Stack direction="row" align="center" gap={2}>
          <Label className="text-xs font-medium">Resolution:</Label>
          <Select
            value={resolution}
            onValueChange={(nextValue) => {
              onResolutionChange(nextValue as Resolution);
            }}
          >
            <SelectTrigger size="sm" className="w-20">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RESOLUTION_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Stack>

        <Stack direction="row" align="center" gap={2}>
          <Label className="text-xs font-medium">Mode:</Label>
          <Select
            value={playbackMode}
            onValueChange={(nextValue) => {
              onPlaybackModeChange(nextValue as PlaybackMode);
            }}
          >
            <SelectTrigger size="sm" className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PLAYBACK_MODE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Stack>
      </Stack>
    </Surface>
  );
}
