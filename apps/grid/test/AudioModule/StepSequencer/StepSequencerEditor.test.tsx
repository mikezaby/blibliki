// @vitest-environment jsdom
import { PlaybackMode, Resolution, type IPage } from "@blibliki/engine";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import StepSequencerEditor from "../../../src/components/AudioModule/StepSequencer/StepSequencerEditor";
import {
  SEQUENCER_CLIPBOARD_TEXT_PREFIX,
  createPageClipboardPayload,
  createStepsClipboardPayload,
  serializeSequencerClipboard,
} from "../../../src/components/AudioModule/StepSequencer/clipboard";

function createPages(): IPage[] {
  const createPage = (name: string) => ({
    name,
    steps: Array.from({ length: 16 }, (_, index) => ({
      active: index === 1,
      notes: index === 1 ? [{ note: "D3", velocity: 90 }] : [],
      ccMessages: [],
      probability: 100,
      microtimeOffset: 0,
      duration: "1/16" as const,
    })),
  });

  return [
    createPage("Page 1"),
    {
      ...createPage("Page 2"),
    },
  ];
}

describe("StepSequencerEditor", () => {
  afterEach(cleanup);

  it("selects a step and renders it in the shared step editor", () => {
    render(
      <StepSequencerEditor
        pages={createPages()}
        activePageNo={0}
        stepsPerPage={16}
        resolution={Resolution.sixteenth}
        playbackMode={PlaybackMode.loop}
        onPageChange={vi.fn()}
        onStepChange={vi.fn()}
        onResolutionChange={vi.fn()}
        onPlaybackModeChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Step 2" }));

    expect(screen.getByText("D3")).toBeDefined();
  });

  it("emits an immutable step update when toggling activation", () => {
    const pages = createPages();
    const onStepChange = vi.fn();

    render(
      <StepSequencerEditor
        pages={pages}
        activePageNo={0}
        stepsPerPage={16}
        resolution={Resolution.sixteenth}
        playbackMode={PlaybackMode.loop}
        onPageChange={vi.fn()}
        onStepChange={onStepChange}
        onResolutionChange={vi.fn()}
        onPlaybackModeChange={vi.fn()}
      />,
    );

    fireEvent.click(
      screen.getAllByRole("button", { name: "Activate step" })[0]!,
    );

    expect(onStepChange).toHaveBeenCalledWith(
      0,
      0,
      expect.objectContaining({ active: true }),
    );
    expect(pages[0]?.steps[0]?.active).toBe(false);
  });

  it("hides CC editing and transport controls when capabilities are absent", () => {
    render(
      <StepSequencerEditor
        pages={createPages()}
        activePageNo={0}
        stepsPerPage={16}
        resolution={Resolution.sixteenth}
        playbackMode={PlaybackMode.loop}
        onPageChange={vi.fn()}
        onStepChange={vi.fn()}
        onResolutionChange={vi.fn()}
        onPlaybackModeChange={vi.fn()}
        showCcMessages={false}
      />,
    );

    expect(screen.queryByPlaceholderText("CC#")).toBeNull();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });

  it("selects a contiguous range with Shift-click", () => {
    render(
      <StepSequencerEditor
        pages={createPages()}
        activePageNo={0}
        stepsPerPage={16}
        resolution={Resolution.sixteenth}
        playbackMode={PlaybackMode.loop}
        onPageChange={vi.fn()}
        onStepChange={vi.fn()}
        onResolutionChange={vi.fn()}
        onPlaybackModeChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Step 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Step 6" }), {
      shiftKey: true,
    });

    for (const stepNo of [3, 4, 5, 6]) {
      expect(
        screen.getByRole("button", { name: `Step ${stepNo}` }).className,
      ).toContain("bg-info/10");
    }
    expect(
      screen.getByRole("button", { name: "Step 2" }).className,
    ).not.toContain("bg-info/10");
  });

  it("selects page scope from the page label", () => {
    render(
      <StepSequencerEditor
        pages={createPages()}
        activePageNo={0}
        stepsPerPage={16}
        resolution={Resolution.sixteenth}
        playbackMode={PlaybackMode.loop}
        onPageChange={vi.fn()}
        onStepChange={vi.fn()}
        onResolutionChange={vi.fn()}
        onPlaybackModeChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select Page 1" }));

    expect(screen.getByTestId("step-grid").className).toContain("ring-info");
    expect(
      screen.getByRole("button", { name: "Select Page 1" }).className,
    ).toContain("border-info");
  });

  it("shows Copy and Paste with the current selection scope", () => {
    render(
      <StepSequencerEditor
        pages={createPages()}
        activePageNo={0}
        stepsPerPage={16}
        resolution={Resolution.sixteenth}
        playbackMode={PlaybackMode.loop}
        onPageChange={vi.fn()}
        onStepChange={vi.fn()}
        onResolutionChange={vi.fn()}
        onPlaybackModeChange={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Copy" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Paste" })).toBeDefined();
    expect(screen.getByTestId("clipboard-selection-label").textContent).toBe(
      "Step 1",
    );

    fireEvent.click(screen.getByRole("button", { name: "Step 3" }));
    fireEvent.click(screen.getByRole("button", { name: "Step 6" }), {
      shiftKey: true,
    });
    expect(screen.getByTestId("clipboard-selection-label").textContent).toBe(
      "Steps 3–6",
    );
  });

  it("handles native copy inside the sequencer", () => {
    render(
      <StepSequencerEditor
        pages={createPages()}
        activePageNo={0}
        stepsPerPage={16}
        resolution={Resolution.sixteenth}
        playbackMode={PlaybackMode.loop}
        onPageChange={vi.fn()}
        onStepChange={vi.fn()}
        onResolutionChange={vi.fn()}
        onPlaybackModeChange={vi.fn()}
      />,
    );
    const setData = vi.fn();

    const handled = !fireEvent.copy(
      screen.getByTestId("step-sequencer-editor"),
      { clipboardData: { setData } },
    );

    expect(handled).toBe(true);
    expect(setData).toHaveBeenCalledWith(
      "application/x-blibliki-step-sequencer-clipboard",
      expect.any(String),
    );
  });

  it("partially pastes a phrase from the toolbar and reports the result", async () => {
    const pages = createPages();
    const payload = createStepsClipboardPayload(pages[0]!.steps, 0, 3);
    const onPagesChange = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: vi
          .fn()
          .mockResolvedValue(
            `${SEQUENCER_CLIPBOARD_TEXT_PREFIX}${serializeSequencerClipboard(payload)}`,
          ),
        writeText: vi.fn(),
      },
    });

    render(
      <StepSequencerEditor
        pages={pages}
        activePageNo={0}
        stepsPerPage={16}
        resolution={Resolution.sixteenth}
        playbackMode={PlaybackMode.loop}
        onPageChange={vi.fn()}
        onStepChange={vi.fn()}
        onPagesChange={onPagesChange}
        onResolutionChange={vi.fn()}
        onPlaybackModeChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Step 15" }));
    fireEvent.click(screen.getByRole("button", { name: "Paste" }));

    await waitFor(() => {
      expect(onPagesChange).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole("status").textContent).toBe("Pasted 2 of 4 steps");
  });

  it("pastes a page while preserving the destination page name", async () => {
    const pages = createPages();
    pages[0]!.steps[0] = {
      ...pages[0]!.steps[0]!,
      active: true,
      notes: [{ note: "C4", velocity: 111 }],
    };
    const payload = createPageClipboardPayload(pages[0]!);
    const onPagesChange = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: vi
          .fn()
          .mockResolvedValue(
            `${SEQUENCER_CLIPBOARD_TEXT_PREFIX}${serializeSequencerClipboard(payload)}`,
          ),
        writeText: vi.fn(),
      },
    });

    render(
      <StepSequencerEditor
        pages={pages}
        activePageNo={1}
        stepsPerPage={16}
        resolution={Resolution.sixteenth}
        playbackMode={PlaybackMode.loop}
        onPageChange={vi.fn()}
        onStepChange={vi.fn()}
        onPagesChange={onPagesChange}
        onResolutionChange={vi.fn()}
        onPlaybackModeChange={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Select Page 2" }));
    fireEvent.click(screen.getByRole("button", { name: "Paste" }));

    await waitFor(() => {
      expect(onPagesChange).toHaveBeenCalledTimes(1);
    });
    const updatedPages = onPagesChange.mock.calls[0]![0] as IPage[];
    expect(updatedPages[1]?.name).toBe("Page 2");
    expect(updatedPages[1]?.steps[0]?.notes).toEqual([
      { note: "C4", velocity: 111 },
    ]);
  });

  it("preserves normal text copy inside step inputs", () => {
    render(
      <StepSequencerEditor
        pages={createPages()}
        activePageNo={0}
        stepsPerPage={16}
        resolution={Resolution.sixteenth}
        playbackMode={PlaybackMode.loop}
        onPageChange={vi.fn()}
        onStepChange={vi.fn()}
        onResolutionChange={vi.fn()}
        onPlaybackModeChange={vi.fn()}
      />,
    );
    const setData = vi.fn();

    const handled = !fireEvent.copy(
      screen.getByPlaceholderText("Add note (e.g., C4, D#4, E4)..."),
      { clipboardData: { setData } },
    );

    expect(handled).toBe(false);
    expect(setData).not.toHaveBeenCalled();
  });
});
