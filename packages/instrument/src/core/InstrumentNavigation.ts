import { type IStepSequencerProps, ModuleType } from "@blibliki/engine";
import type {
  CompiledInstrumentEnginePatch,
  CompiledInstrumentLaunchControlXL3PageSummary,
  CompiledInstrumentTrack,
  InstrumentNavigationState,
} from "@/compiler/instrumentTypes";
import type { CompiledLaunchControlXL3Page } from "@/compiler/types";

export type InstrumentNavigationAction =
  "nextTrack" | "previousTrack" | "nextPage" | "previousPage";

function wrapIndex(nextIndex: number, length: number) {
  return ((nextIndex % length) + length) % length;
}

function getSequencerPageCount(
  runtimePatch: CompiledInstrumentEnginePatch,
  activeTrackIndex: number,
) {
  const track = runtimePatch.compiledInstrument.tracks[activeTrackIndex];
  const moduleId = track
    ? runtimePatch.runtime.stepSequencerIds[track.key]
    : undefined;
  const module = runtimePatch.patch.modules.find(
    (candidate) => candidate.id === moduleId,
  );
  if (module?.moduleType !== ModuleType.StepSequencer) {
    return 1;
  }

  const props = module.props as IStepSequencerProps;
  const pattern = props.patterns[props.activePatternNo] ?? props.patterns[0];

  return Math.max(1, pattern?.pages.length ?? 1);
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
    runtimePatch.compiledInstrument.tracks.length,
  );
  const pageKeys = getPageKeys(runtimePatch, activeTrackIndex);
  const activePage = pageKeys.includes(navigation.activePage)
    ? navigation.activePage
    : pageKeys[0];
  if (!activePage) {
    throw new Error(`Track ${activeTrackIndex} has no pages`);
  }
  const sequencerTrack = isSequencerTrack(runtimePatch, activeTrackIndex);
  const mode =
    sequencerTrack && navigation.mode === "seqEdit" ? "seqEdit" : "performance";

  return {
    activeTrackIndex,
    activePage,
    mode,
    shiftPressed: navigation.shiftPressed,
    sequencerPageIndex: wrapIndex(
      navigation.sequencerPageIndex,
      getSequencerPageCount(runtimePatch, activeTrackIndex),
    ),
    heldSteps:
      mode === "seqEdit"
        ? navigation.heldSteps.filter(
            (held) => held.stepIndex >= 0 && held.stepIndex < 16,
          )
        : [],
    stepDefaults: navigation.stepDefaults,
    heldNotes:
      mode === "seqEdit" && navigation.heldNotes?.length
        ? navigation.heldNotes
        : undefined,
    stepRecord:
      mode === "seqEdit" && navigation.stepRecord
        ? {
            ...navigation.stepRecord,
            cursor: wrapIndex(navigation.stepRecord.cursor, 16),
          }
        : undefined,
    liveRecord: sequencerTrack ? navigation.liveRecord : undefined,
    copySource:
      mode === "seqEdit" &&
      navigation.shiftPressed &&
      navigation.copySource !== undefined &&
      navigation.copySource >= 0 &&
      navigation.copySource < 16
        ? navigation.copySource
        : undefined,
    fill:
      mode === "seqEdit" && navigation.shiftPressed
        ? navigation.fill
        : undefined,
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
