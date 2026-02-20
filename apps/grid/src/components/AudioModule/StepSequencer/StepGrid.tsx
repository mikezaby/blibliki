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

  return (
    <Surface tone="subtle" border="subtle" radius="md" className="p-4">
      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${stepsPerPage}, minmax(0, 1fr))`,
        }}
      >
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
