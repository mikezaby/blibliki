import { IStep } from "@blibliki/engine";
import { Button, Stack } from "@blibliki/ui";

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
  const intensityTier =
    !isActive || !hasNotes
      ? "inactive"
      : intensity > 0.66
        ? "high"
        : intensity > 0.33
          ? "mid"
          : "low";

  const stepToneClasses =
    intensityTier === "inactive"
      ? "bg-surface-panel text-content-muted"
      : intensityTier === "high"
        ? "bg-info text-white"
        : intensityTier === "mid"
          ? "bg-info/85 text-content-primary"
          : "bg-info/65 text-content-primary";

  const stepBorderClasses = isPlaying
    ? "border-warning border-2 ring-2 ring-warning/25"
    : isSelected
      ? "border-info border-2"
      : isActive && hasNotes
        ? "border-info/60"
        : "border-border-subtle";

  const toggleClasses = isActive
    ? "bg-success border-success/80"
    : "bg-transparent border-border-subtle";

  return (
    <Stack align="center" gap={1}>
      <Button
        size="icon"
        variant="outlined"
        color="neutral"
        aria-label={isActive ? "Mute step" : "Activate step"}
        onClick={(e) => {
          e.stopPropagation();
          onToggleActive();
        }}
        className={`h-3 w-3 rounded-full border-2 p-0 transition-all hover:scale-125 ${toggleClasses}`}
        title={isActive ? "Click to mute step" : "Click to activate step"}
      />

      <Button
        size="sm"
        variant="outlined"
        color="neutral"
        aria-label={`Step ${stepIndex + 1}`}
        onClick={onSelect}
        className={`relative h-12 w-full justify-center px-0 text-xs font-medium transition-all duration-150 hover:scale-105 ${stepToneClasses} ${stepBorderClasses} ${
          isPlaying ? "animate-pulse" : ""
        }`}
      >
        {stepIndex + 1}
        {hasNotes && (
          <span
            aria-hidden
            className="absolute bottom-1 right-1 h-1 w-1 rounded-full bg-current/25"
          />
        )}
      </Button>
    </Stack>
  );
}
