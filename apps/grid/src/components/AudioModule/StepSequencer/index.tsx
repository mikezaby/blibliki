import {
  ModuleType,
  IStep,
  IPage,
  IPattern,
  Engine,
  StepSequencer as StepSequencerModule,
} from "@blibliki/engine";
import { useState, useEffect, useCallback } from "react";
import { ModuleComponent } from "..";
import Container from "../Container";
import Controls from "./Controls";
import PageNavigator from "./PageNavigator";
import PatternSelector from "./PatternSelector";
import StepEditor from "./StepEditor";
import StepGrid from "./StepGrid";

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
  const [selectedStep, setSelectedStep] = useState<number>(0);
  const [lastConfiguredStep, setLastConfiguredStep] = useState<IStep | null>(
    null,
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // Get the module instance
  const getModuleInstance = useCallback((): StepSequencerModule | undefined => {
    const module = Engine.current.modules.get(id);
    return module as StepSequencerModule | undefined;
  }, [id]);

  // Check running state on mount and set up interval to poll
  useEffect(() => {
    const checkRunningState = () => {
      const module = getModuleInstance();
      if (module) {
        setIsRunning(module.isRunning);
      }
    };

    checkRunningState();
    const interval = setInterval(checkRunningState, 100);

    return () => {
      clearInterval(interval);
    };
  }, [id, getModuleInstance]);

  // Start sequencer handler
  const handleStart = () => {
    const module = getModuleInstance();
    if (module) {
      module.startSequencer();
      setIsRunning(true);
    }
  };

  // Stop sequencer handler
  const handleStop = () => {
    const module = getModuleInstance();
    if (module) {
      const audioContext = Engine.current.context.audioContext;
      module.stopSequencer(audioContext.currentTime);
      setIsRunning(false);
    }
  };

  const {
    patterns,
    activePatternNo,
    activePageNo,
    stepsPerPage,
    resolution,
    playbackMode,
    _currentStep,
    patternSequence,
    enableSequence,
    _sequencePosition,
    _sequenceError,
  } = sequencerProps;

  const currentPattern = patterns[activePatternNo];
  const currentPage = currentPattern?.pages[activePageNo];
  const steps = currentPage?.steps ?? [];

  // Update a specific step - PROPERLY deep copy nested structures
  const updateStep = (stepIndex: number, updates: Partial<IStep>) => {
    const currentStep = steps[stepIndex];
    if (!currentStep) return;

    // Check if we're activating a previously inactive step
    const isActivating = !currentStep.active && updates.active === true;

    // Deep copy patterns array
    const updatedPatterns = patterns.map((pattern, pIdx) => {
      if (pIdx !== activePatternNo) return pattern;

      // Deep copy pages array
      const updatedPages = pattern.pages.map((page, pageIdx) => {
        if (pageIdx !== activePageNo) return page;

        // Deep copy steps array
        const updatedSteps = page.steps.map((step, sIdx) => {
          if (sIdx !== stepIndex) return step;

          // If activating and we have a last configured step, inherit its params
          if (isActivating && lastConfiguredStep) {
            return {
              ...step,
              active: true,
              notes: [...lastConfiguredStep.notes],
              ccMessages: [...lastConfiguredStep.ccMessages],
              probability: lastConfiguredStep.probability,
              microtimeOffset: lastConfiguredStep.microtimeOffset,
              duration: lastConfiguredStep.duration,
            };
          }

          // Otherwise, merge updates into the step
          return { ...step, ...updates };
        });

        return { ...page, steps: updatedSteps };
      });

      return { ...pattern, pages: updatedPages };
    });

    // Update patterns prop
    updateProp("patterns")(updatedPatterns);

    // Track this as the last configured step if it's now active
    const updatedStep =
      isActivating && lastConfiguredStep
        ? {
            ...currentStep,
            active: true,
            notes: [...lastConfiguredStep.notes],
            ccMessages: [...lastConfiguredStep.ccMessages],
            probability: lastConfiguredStep.probability,
            microtimeOffset: lastConfiguredStep.microtimeOffset,
            duration: lastConfiguredStep.duration,
          }
        : { ...currentStep, ...updates };

    if (updatedStep.active) {
      setLastConfiguredStep(updatedStep);
    }
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
    <Container className="flex flex-col gap-4 p-4 w-full min-w-[800px]">
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
        sequencePosition={_sequencePosition}
        sequenceError={_sequenceError}
        updateProp={updateProp}
        onPatternSequenceChange={(value) => {
          updateProp("patternSequence")(value);
        }}
        onEnableSequenceChange={(value) => {
          updateProp("enableSequence")(value);
        }}
      />

      <PageNavigator
        pages={patterns[activePatternNo]?.pages ?? []}
        activePageNo={activePageNo}
        onPageChange={(index) => {
          updateProp("activePageNo")(index);
        }}
        onAddPage={addPage}
        onDeletePage={deletePage}
      />

      <Controls
        stepsPerPage={stepsPerPage}
        resolution={resolution}
        playbackMode={playbackMode}
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

      <StepGrid
        steps={steps}
        currentStep={_currentStep ?? 0}
        selectedStep={selectedStep}
        onSelectStep={setSelectedStep}
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
      />
    </Container>
  );
};

export default StepSequencer;
