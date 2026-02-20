import { Resolution, PlaybackMode } from "@blibliki/engine";
import {
  Button,
  Select,
  SelectContent,
  SelectItem,
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
    <div className="flex gap-4 items-center p-3 bg-slate-50 dark:bg-slate-800 rounded">
      <div className="flex gap-2">
        <Button
          color={isRunning ? "error" : "success"}
          size="sm"
          className="w-15"
          onClick={isRunning ? onStop : onStart}
        >
          {isRunning ? "Stop" : "Start"}
        </Button>
      </div>

      <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Steps:
        </label>
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
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Resolution:
        </label>
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
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Mode:
        </label>
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
      </div>
    </div>
  );
}
