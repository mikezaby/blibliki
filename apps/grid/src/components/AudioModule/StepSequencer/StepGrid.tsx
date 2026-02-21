import { IStep } from "@blibliki/engine";
import { Surface } from "@blibliki/ui";
import StepButton from "./StepButton";

type StepGridProps = {
  steps: IStep[];
  currentStep: number;
  selectedStep: number;
  onSelectStep: (index: number) => void;
  onToggleActive: (index: number) => void;
  stepsPerPage: number;
};

const GRID_COLUMNS_CLASS_BY_STEPS: Record<number, string> = {
  4: "[grid-template-columns:repeat(4,minmax(0,1fr))]",
  8: "[grid-template-columns:repeat(8,minmax(0,1fr))]",
  12: "[grid-template-columns:repeat(12,minmax(0,1fr))]",
  16: "[grid-template-columns:repeat(16,minmax(0,1fr))]",
};

export default function StepGrid({
  steps,
  currentStep,
  selectedStep,
  onSelectStep,
  onToggleActive,
  stepsPerPage,
}: StepGridProps) {
  // Only show the configured number of steps
  const visibleSteps = steps.slice(0, stepsPerPage);
  const gridColumnsClass =
    GRID_COLUMNS_CLASS_BY_STEPS[stepsPerPage] ??
    "[grid-template-columns:repeat(16,minmax(0,1fr))]";

  return (
    <Surface tone="subtle" border="subtle" radius="md" className="p-4">
      <div className={`grid gap-2 ${gridColumnsClass}`}>
        {visibleSteps.map((step, index) => (
          <StepButton
            key={index}
            step={step}
            stepIndex={index}
            isPlaying={index === currentStep}
            isSelected={index === selectedStep}
            onSelect={() => {
              onSelectStep(index);
            }}
            onToggleActive={() => {
              onToggleActive(index);
            }}
          />
        ))}
      </div>
    </Surface>
  );
}
