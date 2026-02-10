import { IStep } from "@blibliki/engine";
import { Box } from "@chakra-ui/react";
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
    <Box p="4" bg="bg.muted" rounded="md">
      <Box
        display="grid"
        gap="2"
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
      </Box>
    </Box>
  );
}
