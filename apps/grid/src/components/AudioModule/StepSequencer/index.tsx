import {
  ModuleType,
  IStep,
  IPage,
  IPattern,
  Engine,
  StepSequencer as StepSequencerModule,
} from "@blibliki/engine";
import { Stack } from "@blibliki/ui";
import { useCallback } from "react";
import { useModuleState } from "@/hooks";
import { ModuleComponent } from "..";
import PatternSelector from "./PatternSelector";
import StepSequencerEditor from "./StepSequencerEditor";

// Helper to create default step
const createDefaultStep = (): IStep => ({
  active: false,
  notes: [],
  ccMessages: [],
  probability: 100,
  microtimeOffset: 0,
  duration: "1/16",
});

// Helper to create default page
const createDefaultPage = (name: string): IPage => ({
  name,
  steps: Array.from({ length: 16 }, () => createDefaultStep()),
});

// Helper to create default pattern
const createDefaultPattern = (name: string): IPattern => ({
  name,
  pages: [createDefaultPage("Page 1")],
});

const StepSequencer: ModuleComponent<ModuleType.StepSequencer> = (props) => {
  const { id, updateProp, props: sequencerProps } = props;
  const sequencerState = useModuleState(id, ModuleType.StepSequencer);

  // Get the module instance
  const getModuleInstance = useCallback((): StepSequencerModule | undefined => {
    const module = Engine.current.modules.get(id);
    return module as StepSequencerModule | undefined;
  }, [id]);

  // Start sequencer handler
  const handleStart = () => {
    const module = getModuleInstance();
    if (module) {
      const audioContext = Engine.current.context.audioContext;
      module.start(audioContext.currentTime);
    }
  };

  // Stop sequencer handler
  const handleStop = () => {
    const module = getModuleInstance();
    if (module) {
      const audioContext = Engine.current.context.audioContext;
      module.stop(audioContext.currentTime);
    }
  };

  const {
    patterns,
    activePatternNo,
    activePageNo,
    stepsPerPage,
    resolution,
    playbackMode,
    patternSequence,
    enableSequence,
  } = sequencerProps;

  // Extract state values (temporal/runtime data)
  const currentStep = sequencerState.currentStep;
  const sequencePosition = sequencerState.sequencePosition;
  const isRunning = sequencerState.isRunning;

  const currentPattern = patterns[activePatternNo];
  const updateStep = (pageIndex: number, stepIndex: number, step: IStep) => {
    const updatedPatterns = patterns.map((pattern, pIdx) => {
      if (pIdx !== activePatternNo) return pattern;

      const updatedPages = pattern.pages.map((page, pageIdx) => {
        if (pageIdx !== pageIndex) return page;

        return {
          ...page,
          steps: page.steps.map((currentStep, currentStepIndex) =>
            currentStepIndex === stepIndex ? step : currentStep,
          ),
        };
      });

      return { ...pattern, pages: updatedPages };
    });

    updateProp("patterns")(updatedPatterns);
  };

  const updatePages = (pages: IPage[]) => {
    updateProp("patterns")(
      patterns.map((pattern, patternIndex) =>
        patternIndex === activePatternNo ? { ...pattern, pages } : pattern,
      ),
    );
  };

  // Add new pattern
  const addPattern = () => {
    const nextLetter = String.fromCharCode(65 + patterns.length); // A, B, C, D...
    const newPattern = createDefaultPattern(nextLetter);
    updateProp("patterns")([...patterns, newPattern]);
    updateProp("activePatternNo")(patterns.length);
  };

  // Add new page to current pattern
  const addPage = () => {
    if (!currentPattern) return;

    const updatedPatterns = patterns.map((pattern, idx) => {
      if (idx !== activePatternNo) return pattern;

      const pageNum = pattern.pages.length + 1;
      const newPage = createDefaultPage(`Page ${pageNum}`);

      return {
        ...pattern,
        pages: [...pattern.pages, newPage],
      };
    });

    updateProp("patterns")(updatedPatterns);
    updateProp("activePageNo")(currentPattern.pages.length);
  };

  // Delete a pattern
  const deletePattern = (patternIndex: number) => {
    // Don't allow deletion of the last pattern
    if (patterns.length <= 1) return;

    const updatedPatterns = patterns.filter((_, idx) => idx !== patternIndex);
    updateProp("patterns")(updatedPatterns);

    // Adjust active pattern index if needed
    if (activePatternNo >= updatedPatterns.length) {
      updateProp("activePatternNo")(updatedPatterns.length - 1);
    } else if (activePatternNo >= patternIndex) {
      updateProp("activePatternNo")(Math.max(0, activePatternNo - 1));
    }
  };

  // Delete a page from current pattern
  const deletePage = (pageIndex: number) => {
    if (!currentPattern) return;

    // Don't allow deletion of the last page
    if (currentPattern.pages.length <= 1) return;

    const updatedPatterns = patterns.map((pattern, idx) => {
      if (idx !== activePatternNo) return pattern;

      return {
        ...pattern,
        pages: pattern.pages.filter((_, pIdx) => pIdx !== pageIndex),
      };
    });

    updateProp("patterns")(updatedPatterns);

    // Adjust active page index if needed
    if (activePageNo >= currentPattern.pages.length - 1) {
      updateProp("activePageNo")(Math.max(0, currentPattern.pages.length - 2));
    } else if (activePageNo >= pageIndex) {
      updateProp("activePageNo")(Math.max(0, activePageNo - 1));
    }
  };

  return (
    <Stack gap={4} className="w-full min-w-[800px] p-4">
      <PatternSelector
        patterns={patterns}
        activePatternNo={activePatternNo}
        onPatternChange={(index) => {
          updateProp("activePatternNo")(index);
        }}
        onAddPattern={addPattern}
        onDeletePattern={deletePattern}
        isRunning={isRunning}
        enableSequence={enableSequence}
        patternSequence={patternSequence}
        sequencePosition={sequencePosition}
        updateProp={updateProp}
      />

      <StepSequencerEditor
        pages={currentPattern?.pages ?? []}
        activePageNo={activePageNo}
        onPageChange={(index) => {
          updateProp("activePageNo")(index);
        }}
        onStepChange={updateStep}
        onPagesChange={updatePages}
        onAddPage={addPage}
        onDeletePage={deletePage}
        stepsPerPage={stepsPerPage}
        resolution={resolution}
        playbackMode={playbackMode}
        currentStep={currentStep}
        isRunning={isRunning}
        onStepsChange={(value) => {
          updateProp("stepsPerPage")(value);
        }}
        onResolutionChange={(value) => {
          updateProp("resolution")(value);
        }}
        onPlaybackModeChange={(value) => {
          updateProp("playbackMode")(value);
        }}
        onStart={handleStart}
        onStop={handleStop}
      />
    </Stack>
  );
};

export default StepSequencer;
