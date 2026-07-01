import { countNoteTracks } from "@/compiler/instrumentRuntimeState";
import type {
  CompiledInstrumentEnginePatch,
  CompiledInstrumentLaunchControlXL3PageSummary,
  CompiledInstrumentTrack,
  InstrumentNavigationState,
} from "@/compiler/instrumentTypes";
import type { CompiledLaunchControlXL3Page } from "@/compiler/types";

export type InstrumentNavigationAction =
  | "nextTrack"
  | "previousTrack"
  | "nextPage"
  | "previousPage";

function wrapIndex(nextIndex: number, length: number) {
  return ((nextIndex % length) + length) % length;
}

function clampStepIndex(stepIndex: number) {
  return Math.max(0, Math.min(stepIndex, 15));
}

function wrapSequencerPageIndex(pageIndex: number) {
  return wrapIndex(pageIndex, 4);
}

function isSequencerTrack(
  runtimePatch: CompiledInstrumentEnginePatch,
  activeTrackIndex: number,
) {
  const track = runtimePatch.compiledInstrument.tracks[activeTrackIndex];

  return track?.noteSource === "stepSequencer";
}

function getPageKeys(
  runtimePatch: CompiledInstrumentEnginePatch,
  activeTrackIndex: number,
) {
  const activeTrack = runtimePatch.compiledInstrument.tracks[activeTrackIndex];
  if (!activeTrack) {
    throw new Error(`Track ${activeTrackIndex} not found in instrument`);
  }

  return activeTrack.compiledTrack.pages.map((page) => page.key);
}

function normalizeNavigation(
  runtimePatch: CompiledInstrumentEnginePatch,
  navigation: InstrumentNavigationState,
): InstrumentNavigationState {
  const activeTrackIndex = wrapIndex(
    navigation.activeTrackIndex,
    countNoteTracks(runtimePatch.compiledInstrument.tracks),
  );
  const pageKeys = getPageKeys(runtimePatch, activeTrackIndex);
  const activePage = pageKeys.includes(navigation.activePage)
    ? navigation.activePage
    : pageKeys[0];
  if (!activePage) {
    throw new Error(`Track ${activeTrackIndex} has no pages`);
  }
  const sequencerTrack = isSequencerTrack(runtimePatch, activeTrackIndex);

  return {
    activeTrackIndex,
    activePage,
    mode:
      sequencerTrack && navigation.mode === "seqEdit"
        ? "seqEdit"
        : "performance",
    shiftPressed: navigation.shiftPressed,
    sequencerPageIndex: wrapSequencerPageIndex(navigation.sequencerPageIndex),
    selectedStepIndex: clampStepIndex(navigation.selectedStepIndex),
  };
}

export class InstrumentNavigation {
  private constructor(
    private readonly runtimePatch: CompiledInstrumentEnginePatch,
    private readonly state: InstrumentNavigationState,
  ) {}

  static fromRuntimePatch(
    runtimePatch: CompiledInstrumentEnginePatch,
    navigation: InstrumentNavigationState = runtimePatch.runtime.navigation,
  ) {
    return new InstrumentNavigation(
      runtimePatch,
      normalizeNavigation(runtimePatch, navigation),
    );
  }

  get activeTrack(): CompiledInstrumentTrack {
    const activeTrack =
      this.runtimePatch.compiledInstrument.tracks[this.state.activeTrackIndex];

    if (!activeTrack) {
      throw new Error(
        `Track ${this.state.activeTrackIndex} not found in instrument`,
      );
    }

    return activeTrack;
  }

  get activePage(): CompiledInstrumentLaunchControlXL3PageSummary {
    const activePage =
      this.runtimePatch.compiledInstrument.launchControlXL3.pages.find(
        (page) =>
          page.trackIndex === this.state.activeTrackIndex &&
          page.pageKey === this.state.activePage,
      ) ??
      this.runtimePatch.compiledInstrument.launchControlXL3.pages.find(
        (page) => page.trackIndex === this.state.activeTrackIndex,
      );

    if (!activePage) {
      throw new Error("Instrument has no LaunchControlXL3 pages");
    }

    return activePage;
  }

  get visiblePage(): CompiledLaunchControlXL3Page {
    const visiblePage =
      this.activeTrack.compiledTrack.launchControlXL3.resolvedPages.find(
        (page) => page.pageKey === this.activePage.pageKey,
      );

    if (!visiblePage) {
      throw new Error(
        `Page ${this.activePage.pageKey} not found for track ${this.activeTrack.key}`,
      );
    }

    return visiblePage;
  }

  withChanges(
    navigation: Partial<InstrumentNavigationState>,
  ): InstrumentNavigation {
    return InstrumentNavigation.fromRuntimePatch(this.runtimePatch, {
      ...this.state,
      ...navigation,
    });
  }

  navigate(action: InstrumentNavigationAction): InstrumentNavigation {
    if (this.state.mode === "seqEdit") {
      switch (action) {
        case "nextTrack":
          return this.withChanges({
            activeTrackIndex: this.state.activeTrackIndex + 1,
          });
        case "previousTrack":
          return this.withChanges({
            activeTrackIndex: this.state.activeTrackIndex - 1,
          });
        case "nextPage":
          return this.withChanges({
            sequencerPageIndex: this.state.sequencerPageIndex + 1,
          });
        case "previousPage":
          return this.withChanges({
            sequencerPageIndex: this.state.sequencerPageIndex - 1,
          });
      }
    }

    const pageKeys = getPageKeys(
      this.runtimePatch,
      this.state.activeTrackIndex,
    );
    const currentPageIndex = pageKeys.indexOf(this.state.activePage);

    switch (action) {
      case "nextTrack":
        return this.withChanges({
          activeTrackIndex: this.state.activeTrackIndex + 1,
        });
      case "previousTrack":
        return this.withChanges({
          activeTrackIndex: this.state.activeTrackIndex - 1,
        });
      case "nextPage":
        return this.withChanges({
          activePage:
            pageKeys[wrapIndex(currentPageIndex + 1, pageKeys.length)] ??
            this.state.activePage,
        });
      case "previousPage":
        return this.withChanges({
          activePage:
            pageKeys[wrapIndex(currentPageIndex - 1, pageKeys.length)] ??
            this.state.activePage,
        });
    }
  }

  serialize(): InstrumentNavigationState {
    return this.state;
  }
}
