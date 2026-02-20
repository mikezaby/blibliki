import { IStep } from "@blibliki/engine";
import { Button, Stack, uiColorMix, uiTone, uiVars } from "@blibliki/ui";
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
      return uiVars.surface.panel;
    }

    if (intensity > 0.66) return uiTone("info", "600");
    if (intensity > 0.33) return uiTone("info");
    return uiColorMix(uiTone("info"), "white", 30);
  };

  const getBorderColor = () => {
    if (isPlaying) {
      return uiTone("warning");
    }
    if (isSelected) {
      return uiTone("info");
    }
    if (isActive && hasNotes) {
      return uiColorMix(uiTone("info", "600"), uiVars.border.subtle, 35);
    }
    return uiVars.border.subtle;
  };

  const getTextColor = () => {
    if (!isActive || !hasNotes) {
      return uiVars.text.muted;
    }
    return intensity > 0.5 ? uiTone("info", "contrast") : uiVars.text.primary;
  };

  const stepStyle: CSSProperties = {
    background: getBackgroundColor(),
    borderColor: getBorderColor(),
    color: getTextColor(),
    borderWidth: isPlaying || isSelected ? 2 : 1,
    boxShadow: isPlaying
      ? `0 0 0 2px ${uiColorMix(uiTone("warning"), "transparent", 75)}`
      : undefined,
  };

  const toggleStyle: CSSProperties = isActive
    ? {
        background: uiTone("success"),
        borderColor: uiTone("success", "600"),
      }
    : {
        background: "transparent",
        borderColor: uiVars.border.subtle,
      };

  const indicatorStyle: CSSProperties = {
    background: uiColorMix("currentColor", uiVars.text.primary, 25),
  };

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
        className="h-3 w-3 rounded-full border-2 p-0 transition-all hover:scale-125"
        style={toggleStyle}
        title={isActive ? "Click to mute step" : "Click to activate step"}
      />

      <Button
        size="sm"
        variant="outlined"
        color="neutral"
        aria-label={`Step ${stepIndex + 1}`}
        onClick={onSelect}
        className={`relative h-12 w-full justify-center px-0 text-xs font-medium transition-all duration-150 hover:scale-105 ${
          isPlaying ? "animate-pulse" : ""
        }`}
        style={stepStyle}
      >
        {stepIndex + 1}
        {hasNotes && (
          <span
            aria-hidden
            className="absolute bottom-1 right-1 h-1 w-1 rounded-full"
            style={indicatorStyle}
          />
        )}
      </Button>
    </Stack>
  );
}
