import { TransportState } from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import type { InstrumentDisplayState } from "@/display/InstrumentDisplayState";
import {
  countDefaultNoteSteps,
  describeStepNote,
  getActivePage,
  getHeldStepIndices,
  getStepDefaults,
  getStepSequencerProps,
} from "@/sequencer/stepEntry";
import {
  PITCH_CCS,
  STEP_CONTROL_CCS,
  VELOCITY_CCS,
} from "./LaunchControlXL3SequencerControls";

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

function describeHeldSteps(heldSteps: number[]) {
  if (heldSteps.length === 0) {
    return "Defaults";
  }

  const numbers = heldSteps.map((stepIndex) => stepIndex + 1).join(", ");

  return `${heldSteps.length > 1 ? "Steps" : "Step"} ${numbers}`;
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
  const { page } = getActivePage(props, runtimePatch);
  const heldSteps = getHeldStepIndices(runtimePatch);
  const step =
    heldSteps.length > 0 ? page?.steps[heldSteps[0] ?? -1] : undefined;
  const defaults = getStepDefaults(runtimePatch, props);
  const notes = step?.notes ?? [
    { note: defaults.note, velocity: defaults.velocity },
  ];
  const sections = [{ label: describeHeldSteps(heldSteps), startIndex: 0 }];
  const { shiftPressed, fill } = runtimePatch.runtime.navigation;
  // With Shift down the first two encoders become the fill controls.
  const fillSlots = shiftPressed
    ? [
        {
          key: "pulses",
          label: "Pulses",
          shortLabel: "PULS",
          cc: STEP_CONTROL_CCS[0],
          valueText: `${fill?.pulses ?? countDefaultNoteSteps(runtimePatch)}`,
        },
        {
          key: "rotate",
          label: "Rotate",
          shortLabel: "ROT",
          cc: STEP_CONTROL_CCS[1],
          valueText: `${fill?.rotate ?? 0}`,
        },
      ]
    : [
        {
          key: "active",
          label: "Active",
          shortLabel: "ACT",
          cc: STEP_CONTROL_CCS[0],
          inactive: !step,
          valueText: step ? (step.active ? "ON" : "OFF") : "--",
        },
        {
          key: "probability",
          label: "Probability",
          shortLabel: "PROB",
          cc: STEP_CONTROL_CCS[1],
          valueText: `${step?.probability ?? defaults.probability}%`,
        },
      ];

  return {
    header: {
      instrumentName: runtimePatch.compiledInstrument.name,
      trackName: activeTrack.name,
      pageKey: runtimePatch.runtime.navigation.activePage,
      controllerPage: 1,
      midiChannel: activeTrack.midiChannel,
      transportState: TransportState.stopped,
      mode: "seqEdit",
      heldSteps,
    },
    globalBand: {
      slots: [
        ...fillSlots,
        {
          key: "duration",
          label: "Duration",
          shortLabel: "DUR",
          cc: STEP_CONTROL_CCS[2],
          valueText: step?.duration ?? defaults.duration,
        },
        {
          key: "microtime",
          label: "Microtime",
          shortLabel: "MICR",
          cc: STEP_CONTROL_CCS[3],
          inactive: !step,
          valueText: step ? `${step.microtimeOffset}` : "--",
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
      sections,
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
      sections,
      slots: PITCH_CCS.map((cc, index) =>
        createBandSlot(
          cc,
          `pitch-${index + 1}`,
          `Pitch ${index + 1}`,
          `N${index + 1}`,
          notes[index]
            ? describeStepNote(runtimePatch, notes[index].note)
            : "--",
          !notes[index],
        ),
      ) as InstrumentDisplayState["lowerBand"]["slots"],
    },
  };
}
