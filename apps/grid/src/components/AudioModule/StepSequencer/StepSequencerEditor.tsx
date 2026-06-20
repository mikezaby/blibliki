import {
  type IPage,
  type IStep,
  PlaybackMode,
  Resolution,
} from "@blibliki/engine";
import { Stack } from "@blibliki/ui";
import { useState } from "react";
import Controls from "./Controls";
import PageNavigator from "./PageNavigator";
import StepEditor from "./StepEditor";
import StepGrid from "./StepGrid";

type StepSequencerEditorProps = {
  pages: IPage[];
  activePageNo: number;
  stepsPerPage: number;
  resolution: Resolution;
  playbackMode: PlaybackMode;
  currentStep?: number;
  isRunning?: boolean;
  showCcMessages?: boolean;
  onPageChange: (index: number) => void;
  onStepChange: (pageIndex: number, stepIndex: number, step: IStep) => void;
  onStepsChange?: (value: number) => void;
  onResolutionChange: (value: Resolution) => void;
  onPlaybackModeChange: (value: PlaybackMode) => void;
  onAddPage?: () => void;
  onDeletePage?: (index: number) => void;
  onStart?: () => void;
  onStop?: () => void;
};

export default function StepSequencerEditor({
  pages,
  activePageNo,
  stepsPerPage,
  resolution,
  playbackMode,
  currentStep = -1,
  isRunning = false,
  showCcMessages = true,
  onPageChange,
  onStepChange,
  onStepsChange,
  onResolutionChange,
  onPlaybackModeChange,
  onAddPage,
  onDeletePage,
  onStart,
  onStop,
}: StepSequencerEditorProps) {
  const [selection, setSelection] = useState({
    pageIndex: activePageNo,
    stepIndex: 0,
  });
  const [lastConfiguredStep, setLastConfiguredStep] = useState<IStep | null>(
    null,
  );
  const steps = pages[activePageNo]?.steps ?? [];
  const selectedStep =
    selection.pageIndex === activePageNo ? selection.stepIndex : 0;

  const updateStep = (stepIndex: number, updates: Partial<IStep>) => {
    const current = steps[stepIndex];
    if (!current) {
      return;
    }

    const isActivating = !current.active && updates.active === true;
    const next =
      isActivating && lastConfiguredStep
        ? {
            ...current,
            active: true,
            notes: [...lastConfiguredStep.notes],
            ccMessages: [...lastConfiguredStep.ccMessages],
            probability: lastConfiguredStep.probability,
            microtimeOffset: lastConfiguredStep.microtimeOffset,
            duration: lastConfiguredStep.duration,
          }
        : { ...current, ...updates };

    onStepChange(activePageNo, stepIndex, next);

    if (next.active) {
      setLastConfiguredStep(next);
    }
  };

  return (
    <Stack gap={4} className="w-full">
      <PageNavigator
        pages={pages}
        activePageNo={activePageNo}
        onPageChange={onPageChange}
        onAddPage={onAddPage}
        onDeletePage={onDeletePage}
      />

      <Controls
        stepsPerPage={onStepsChange ? stepsPerPage : undefined}
        resolution={resolution}
        playbackMode={playbackMode}
        isRunning={isRunning}
        onStepsChange={onStepsChange}
        onResolutionChange={onResolutionChange}
        onPlaybackModeChange={onPlaybackModeChange}
        onStart={onStart}
        onStop={onStop}
      />

      <StepGrid
        steps={steps}
        currentStep={currentStep}
        selectedStep={selectedStep}
        onSelectStep={(stepIndex) => {
          setSelection({ pageIndex: activePageNo, stepIndex });
        }}
        onToggleActive={(stepIndex) => {
          updateStep(stepIndex, { active: !steps[stepIndex]?.active });
        }}
        stepsPerPage={stepsPerPage}
      />

      <StepEditor
        step={steps[selectedStep]}
        stepIndex={selectedStep}
        onUpdate={(updates) => {
          updateStep(selectedStep, updates);
        }}
        showCcMessages={showCcMessages}
      />
    </Stack>
  );
}
