import { Resolution, PlaybackMode } from "@blibliki/engine";

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
      {/* Start/Stop Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onStart}
          disabled={isRunning}
          className={`px-3 py-1 text-sm font-medium rounded ${
            isRunning
              ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600 text-white"
          }`}
        >
          Start
        </button>
        <button
          onClick={onStop}
          disabled={!isRunning}
          className={`px-3 py-1 text-sm font-medium rounded ${
            !isRunning
              ? "bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          Stop
        </button>
      </div>

      <div className="h-6 w-px bg-slate-300 dark:bg-slate-600" />

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Steps:
        </label>
        <select
          value={stepsPerPage}
          onChange={(e) => {
            onStepsChange(Number(e.target.value));
          }}
          className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
        >
          {[4, 8, 12, 16].map((num) => (
            <option key={num} value={num}>
              {num}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Resolution:
        </label>
        <select
          value={resolution}
          onChange={(e) => {
            onResolutionChange(e.target.value as Resolution);
          }}
          className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
        >
          <option value={Resolution.thirtysecond}>1/32</option>
          <option value={Resolution.sixteenth}>1/16</option>
          <option value={Resolution.eighth}>1/8</option>
          <option value={Resolution.quarter}>1/4</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Mode:
        </label>
        <select
          value={playbackMode}
          onChange={(e) => {
            onPlaybackModeChange(e.target.value as PlaybackMode);
          }}
          className="px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
        >
          <option value={PlaybackMode.loop}>Loop</option>
          <option value={PlaybackMode.oneShot}>One-Shot</option>
        </select>
      </div>
    </div>
  );
}
