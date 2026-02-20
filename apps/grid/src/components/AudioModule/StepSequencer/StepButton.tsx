import { IStep } from "@blibliki/engine";
import { Stack } from "@blibliki/ui";
import { type CSSProperties } from "react";

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

  const getBackgroundColor = () => {
    if (!isActive || !hasNotes) {
      return "var(--ui-color-surface-panel)";
    }

    if (intensity > 0.66) return "var(--ui-color-info-600)";
    if (intensity > 0.33) return "var(--ui-color-info-500)";
    return "color-mix(in oklab, var(--ui-color-info-500), white 30%)";
  };

  const getBorderColor = () => {
    if (isPlaying) {
      return "var(--ui-color-warning-500)";
    }
    if (isSelected) {
      return "var(--ui-color-info-500)";
    }
    if (isActive && hasNotes) {
      return "color-mix(in oklab, var(--ui-color-info-600), var(--ui-color-border-subtle) 35%)";
    }
    return "var(--ui-color-border-subtle)";
  };

  const getAnimation = () => {
    return isPlaying ? "animate-pulse" : "";
  };

  const getTextColor = () => {
    if (!isActive || !hasNotes) {
      return "var(--ui-color-text-muted)";
    }
    return intensity > 0.5
      ? "var(--ui-color-info-contrast)"
      : "var(--ui-color-text-primary)";
  };

  const stepStyle: CSSProperties = {
    background: getBackgroundColor(),
    borderColor: getBorderColor(),
    color: getTextColor(),
    borderWidth: isPlaying || isSelected ? 2 : 1,
    boxShadow: isPlaying
      ? "0 0 0 2px color-mix(in oklab, var(--ui-color-warning-500), transparent 75%)"
      : undefined,
  };

  const toggleStyle: CSSProperties = isActive
    ? {
        background: "var(--ui-color-success-500)",
        borderColor: "var(--ui-color-success-600)",
      }
    : {
        background: "transparent",
        borderColor: "var(--ui-color-border-subtle)",
      };

  const indicatorStyle: CSSProperties = {
    background:
      "color-mix(in oklab, currentColor, var(--ui-color-text-primary) 25%)",
  };

  return (
    <Stack align="center" gap={1}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleActive();
        }}
        className="h-3 w-3 cursor-pointer rounded-full border-2 transition-all hover:scale-125"
        style={toggleStyle}
        title={isActive ? "Click to mute step" : "Click to activate step"}
      />

      <button
        onClick={onSelect}
        className={`relative flex h-12 w-full items-center justify-center rounded border text-xs font-medium transition-all duration-150 hover:scale-105 ${getAnimation()}`}
        style={stepStyle}
      >
        {stepIndex + 1}
        {hasNotes && (
          <div
            className="absolute bottom-1 right-1 h-1 w-1 rounded-full"
            style={indicatorStyle}
          />
        )}
      </button>
    </Stack>
  );
}
