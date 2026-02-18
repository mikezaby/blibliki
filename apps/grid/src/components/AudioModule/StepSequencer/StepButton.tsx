import { IStep } from "@blibliki/engine";

type StepButtonProps = {
  step: IStep;
  stepIndex: number;
  isPlaying: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleActive: () => void;
};

export default function StepButton({
  step,
  stepIndex,
  isPlaying,
  isSelected,
  onSelect,
  onToggleActive,
}: StepButtonProps) {
  const hasNotes = step.notes.length > 0;
  const isActive = step.active;

  // Calculate intensity based on max velocity in step
  const maxVelocity = hasNotes
    ? Math.max(...step.notes.map((n) => n.velocity))
    : 0;
  const intensity = maxVelocity / 127; // 0-1 range

  // Determine background color based on state
  const getBackgroundColor = () => {
    if (!isActive || !hasNotes) {
      return "bg-slate-100 dark:bg-slate-700"; // Inactive/empty
    }

    // Active with notes - use intensity
    if (intensity > 0.66) return "bg-blue-500 dark:bg-blue-600";
    if (intensity > 0.33) return "bg-blue-400 dark:bg-blue-500";
    return "bg-blue-300 dark:bg-blue-400";
  };

  // Determine border style
  const getBorderStyle = () => {
    if (isPlaying) {
      return "border-2 border-orange-500 shadow-lg shadow-orange-200 dark:shadow-orange-900"; // Playing
    }
    if (isSelected) {
      return "border-2 border-yellow-400 dark:border-yellow-500"; // Selected
    }
    if (isActive && hasNotes) {
      return "border border-blue-600 dark:border-blue-400"; // Active with notes
    }
    return "border border-slate-300 dark:border-slate-600"; // Default
  };

  // Add pulsing animation for playing step
  const getAnimation = () => {
    return isPlaying ? "animate-pulse" : "";
  };

  const getTextColor = () => {
    if (!isActive || !hasNotes) {
      return "text-slate-400 dark:text-slate-500";
    }
    return intensity > 0.5
      ? "text-white"
      : "text-slate-700 dark:text-slate-100";
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleActive();
        }}
        className={`
          w-3 h-3 rounded-full border-2 transition-all
          hover:scale-125 cursor-pointer
          ${
            isActive
              ? "bg-green-500 border-green-600 dark:bg-green-400 dark:border-green-500"
              : "bg-transparent border-slate-400 dark:border-slate-500"
          }
        `}
        title={isActive ? "Click to mute step" : "Click to activate step"}
      />

      <button
        onClick={onSelect}
        className={`
          relative
          h-12 w-full
          rounded
          flex items-center justify-center
          text-xs font-medium
          transition-all duration-150
          hover:scale-105
          ${getBackgroundColor()}
          ${getBorderStyle()}
          ${getAnimation()}
          ${getTextColor()}
        `}
      >
        {stepIndex + 1}
        {hasNotes && (
          <div className="absolute bottom-1 right-1 w-1 h-1 rounded-full bg-current" />
        )}
      </button>
    </div>
  );
}
