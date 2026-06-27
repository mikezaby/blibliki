import { TransportState } from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import type { InstrumentDisplayState } from "@/display/InstrumentDisplayState";
import {
  DURATION_OPTIONS,
  PITCH_CCS,
  STEP_CONTROL_CCS,
  VELOCITY_CCS,
} from "./LaunchControlXL3SequencerControls";
import {
  getActiveStep,
  getStepSequencerProps,
} from "./LaunchControlXL3SequencerState";

function createBandSlot(
  cc: number,
  slotKey: string,
  label: string,
  shortLabel: string,
  valueText: string,
  inactive = false,
) {
  return {
    kind: "slot" as const,
    blockKey: "sequencer",
    slotKey,
    label,
    shortLabel,
    cc,
    inactive,
    valueText,
  };
}

export function createLaunchControlXL3SequencerDisplayState(
  runtimePatch: CompiledInstrumentEnginePatch,
): InstrumentDisplayState | null {
  const stepSequencer = getStepSequencerProps(runtimePatch);
  const activeTrack =
    runtimePatch.compiledInstrument.tracks[
      runtimePatch.runtime.navigation.activeTrackIndex
    ];
  if (!stepSequencer || !activeTrack) {
    return null;
  }

  const { props } = stepSequencer;
  const { step } = getActiveStep(props, runtimePatch);
  const notes = step?.notes ?? [];

  return {
    header: {
      instrumentName: runtimePatch.compiledInstrument.name,
      trackName: activeTrack.name,
      pageKey: runtimePatch.runtime.navigation.activePage,
      controllerPage: 1,
      midiChannel: activeTrack.midiChannel,
      transportState: TransportState.stopped,
      mode: "seqEdit",
    },
    globalBand: {
      slots: [
        {
          key: "active",
          label: "Active",
          shortLabel: "ACT",
          cc: STEP_CONTROL_CCS[0],
          valueText: step?.active ? "ON" : "OFF",
        },
        {
          key: "probability",
          label: "Probability",
          shortLabel: "PROB",
          cc: STEP_CONTROL_CCS[1],
          valueText: `${step?.probability ?? 100}%`,
        },
        {
          key: "duration",
          label: "Duration",
          shortLabel: "DUR",
          cc: STEP_CONTROL_CCS[2],
          valueText: step?.duration ?? DURATION_OPTIONS[0] ?? "1/16",
        },
        {
          key: "microtime",
          label: "Microtime",
          shortLabel: "MICR",
          cc: STEP_CONTROL_CCS[3],
          valueText: `${step?.microtimeOffset ?? 0}`,
        },
        {
          key: "resolution",
          label: "Resolution",
          shortLabel: "RES",
          cc: STEP_CONTROL_CCS[4],
          valueText: props.resolution,
        },
        {
          key: "playbackMode",
          label: "Playback Mode",
          shortLabel: "MODE",
          cc: STEP_CONTROL_CCS[5],
          valueText: props.playbackMode,
        },
        {
          key: "inactive",
          label: "Inactive",
          shortLabel: "---",
          cc: STEP_CONTROL_CCS[6],
          inactive: true,
          valueText: "--",
        },
        {
          key: "loopLength",
          label: "Loop Length",
          shortLabel: "LOOP",
          cc: STEP_CONTROL_CCS[7],
          valueText: `${props.loopLength}`,
        },
      ] as InstrumentDisplayState["globalBand"]["slots"],
    },
    upperBand: {
      position: "top",
      title: "VELOCITY",
      sections: [{ label: "Velocity", startIndex: 0 }],
      slots: VELOCITY_CCS.map((cc, index) =>
        createBandSlot(
          cc,
          `velocity-${index + 1}`,
          `Velocity ${index + 1}`,
          `VEL${index + 1}`,
          notes[index] ? `${notes[index].velocity}` : "--",
          !notes[index],
        ),
      ) as InstrumentDisplayState["upperBand"]["slots"],
    },
    lowerBand: {
      position: "bottom",
      title: "PITCH",
      sections: [{ label: "Pitch", startIndex: 0 }],
      slots: PITCH_CCS.map((cc, index) =>
        createBandSlot(
          cc,
          `pitch-${index + 1}`,
          `Pitch ${index + 1}`,
          `N${index + 1}`,
          notes[index]?.note ?? "--",
          !notes[index],
        ),
      ) as InstrumentDisplayState["lowerBand"]["slots"],
    },
  };
}
