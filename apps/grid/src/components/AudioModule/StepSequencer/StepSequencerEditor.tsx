import {
  type IPage,
  type IStep,
  PlaybackMode,
  Resolution,
} from "@blibliki/engine";
import { Stack } from "@blibliki/ui";
import { isTextInputLikeTarget } from "@blibliki/utils";
import { useState, type ClipboardEvent } from "react";
import ClipboardToolbar from "./ClipboardToolbar";
import Controls from "./Controls";
import PageNavigator from "./PageNavigator";
import StepEditor from "./StepEditor";
import StepGrid from "./StepGrid";
import {
  createPageClipboardPayload,
  createStepsClipboardPayload,
  pasteSequencerClipboard,
  readSequencerClipboard,
  readSequencerClipboardFromDataTransfer,
  writeSequencerClipboard,
  writeSequencerClipboardToDataTransfer,
  type SequencerClipboardPayload,
  type SequencerSelection,
} from "./clipboard";

type StepSequencerEditorProps = {
  pages: IPage[];
  activePageNo: number;
  stepsPerPage: number;
  resolution: Resolution;
  playbackMode: PlaybackMode;
  probabilityAmount?: number;
  currentStep?: number;
  isRunning?: boolean;
  showCcMessages?: boolean;
  onPageChange: (index: number) => void;
  onStepChange: (pageIndex: number, stepIndex: number, step: IStep) => void;
  onPagesChange?: (pages: IPage[]) => void;
  onStepsChange?: (value: number) => void;
  onResolutionChange: (value: Resolution) => void;
  onPlaybackModeChange: (value: PlaybackMode) => void;
  onProbabilityAmountChange?: (value: number) => void;
  onAddPage?: () => void;
  onDeletePage?: (index: number) => void;
  onStart?: () => void;
  onStop?: () => void;
};

type EditorSelection =
  | {
      pageIndex: number;
      scope: "steps";
      anchor: number;
      focus: number;
    }
  | {
      pageIndex: number;
      scope: "page";
      anchor: number;
      focus: number;
    };

export default function StepSequencerEditor({
  pages,
  activePageNo,
  stepsPerPage,
  resolution,
  playbackMode,
  probabilityAmount = 1,
  currentStep = -1,
  isRunning = false,
  showCcMessages = true,
  onPageChange,
  onStepChange,
  onPagesChange,
  onStepsChange,
  onResolutionChange,
  onPlaybackModeChange,
  onProbabilityAmountChange,
  onAddPage,
  onDeletePage,
  onStart,
  onStop,
}: StepSequencerEditorProps) {
  const [selection, setSelection] = useState<EditorSelection>({
    pageIndex: activePageNo,
    scope: "steps" as const,
    anchor: 0,
    focus: 0,
  });
  const [lastConfiguredStep, setLastConfiguredStep] = useState<IStep | null>(
    null,
  );
  const [clipboardStatus, setClipboardStatus] = useState<string>();
  const steps = pages[activePageNo]?.steps ?? [];
  const currentSelection =
    selection.pageIndex === activePageNo
      ? selection
      : {
          pageIndex: activePageNo,
          scope: "steps" as const,
          anchor: 0,
          focus: 0,
        };
  const selectedStep =
    currentSelection.scope === "steps" ? currentSelection.focus : 0;
  const selectionStart =
    currentSelection.scope === "steps"
      ? Math.min(currentSelection.anchor, currentSelection.focus)
      : -1;
  const selectionEnd =
    currentSelection.scope === "steps"
      ? Math.max(currentSelection.anchor, currentSelection.focus)
      : -1;
  const clipboardSelection: SequencerSelection =
    currentSelection.scope === "page"
      ? { scope: "page" }
      : { scope: "steps", start: selectionStart, end: selectionEnd };
  const selectionLabel =
    currentSelection.scope === "page"
      ? `Page ${activePageNo + 1}`
      : selectionStart === selectionEnd
        ? `Step ${selectionStart + 1}`
        : `Steps ${selectionStart + 1}–${selectionEnd + 1}`;

  const handlePageChange = (pageIndex: number) => {
    setSelection({
      pageIndex,
      scope: "steps",
      anchor: 0,
      focus: 0,
    });
    onPageChange(pageIndex);
  };

  const createClipboardPayload = (): SequencerClipboardPayload | null => {
    const page = pages[activePageNo];
    if (!page) return null;

    return currentSelection.scope === "page"
      ? createPageClipboardPayload(page)
      : createStepsClipboardPayload(page.steps, selectionStart, selectionEnd);
  };

  const applyClipboardPayload = (payload: SequencerClipboardPayload | null) => {
    if (!payload) {
      setClipboardStatus("Clipboard does not contain sequencer data");
      return;
    }

    const result = pasteSequencerClipboard(
      pages,
      activePageNo,
      clipboardSelection,
      payload,
    );
    if (!result.applied || !onPagesChange) {
      setClipboardStatus("Clipboard scope does not match selection");
      return;
    }

    onPagesChange(result.pages);
    setClipboardStatus(
      result.pastedCount < result.totalCount
        ? `Pasted ${result.pastedCount} of ${result.totalCount} steps`
        : payload.kind === "page"
          ? `Pasted page into Page ${activePageNo + 1}`
          : `Pasted ${result.pastedCount} step${result.pastedCount === 1 ? "" : "s"}`,
    );
  };

  const handleToolbarCopy = () => {
    const payload = createClipboardPayload();
    if (!payload) return;

    void writeSequencerClipboard(payload);
    setClipboardStatus(`Copied ${selectionLabel}`);
  };

  const handleToolbarPaste = () => {
    void readSequencerClipboard().then(applyClipboardPayload);
  };

  const handleCopy = (event: ClipboardEvent<HTMLDivElement>) => {
    if (isTextInputLikeTarget(event.target)) return;
    const payload = createClipboardPayload();
    if (!payload) return;

    event.preventDefault();
    event.stopPropagation();
    writeSequencerClipboardToDataTransfer(event.clipboardData, payload);
    setClipboardStatus(`Copied ${selectionLabel}`);
  };

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    if (isTextInputLikeTarget(event.target)) return;

    event.preventDefault();
    event.stopPropagation();
    applyClipboardPayload(
      readSequencerClipboardFromDataTransfer(event.clipboardData),
    );
  };

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
    <div
      data-testid="step-sequencer-editor"
      data-sequencer-clipboard-scope
      onCopy={handleCopy}
      onPaste={handlePaste}
    >
      <Stack gap={4} className="w-full">
        <PageNavigator
          pages={pages}
          activePageNo={activePageNo}
          pageSelected={currentSelection.scope === "page"}
          onPageChange={handlePageChange}
          onSelectPage={() => {
            setSelection({
              pageIndex: activePageNo,
              scope: "page",
              anchor: 0,
              focus: 0,
            });
          }}
          onAddPage={onAddPage}
          onDeletePage={onDeletePage}
        />

        <Controls
          stepsPerPage={onStepsChange ? stepsPerPage : undefined}
          resolution={resolution}
          playbackMode={playbackMode}
          probabilityAmount={probabilityAmount}
          isRunning={isRunning}
          onStepsChange={onStepsChange}
          onResolutionChange={onResolutionChange}
          onPlaybackModeChange={onPlaybackModeChange}
          onProbabilityAmountChange={onProbabilityAmountChange}
          onStart={onStart}
          onStop={onStop}
        />

        <ClipboardToolbar
          selectionLabel={selectionLabel}
          status={clipboardStatus}
          onCopy={handleToolbarCopy}
          onPaste={handleToolbarPaste}
        />

        <StepGrid
          steps={steps}
          currentStep={currentStep}
          selectedStep={selectedStep}
          selectionStart={selectionStart}
          selectionEnd={selectionEnd}
          pageSelected={currentSelection.scope === "page"}
          onSelectStep={(stepIndex, extendSelection) => {
            setSelection({
              pageIndex: activePageNo,
              scope: "steps",
              anchor:
                extendSelection && currentSelection.scope === "steps"
                  ? currentSelection.anchor
                  : stepIndex,
              focus: stepIndex,
            });
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
    </div>
  );
}
