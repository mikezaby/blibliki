import type { ICreateModule, ModuleType } from "@blibliki/engine";
import {
  DelayTimeMode,
  ModuleType as EngineModuleType,
  ReverbType,
} from "@blibliki/engine";
import type { MidiPortSelection } from "@/core/midiPortSelection";
import type {
  InstrumentDocument,
  InstrumentTrackDocument,
} from "@/document/types";
import type { CompiledInstrumentMidiMapperProps } from "./instrumentTypes";

type RuntimeModule<T extends ModuleType> = ICreateModule<T> & { id: string };

export type SerializableRuntimeModule = RuntimeModule<ModuleType> & {
  voices?: number;
};

export function createMidiInputModule(
  id: string,
  name: string,
  selection: MidiPortSelection,
): RuntimeModule<ModuleType.MidiInput> {
  return {
    id,
    name,
    moduleType: EngineModuleType.MidiInput,
    props: {
      selectedId: selection.selectedId ?? null,
      selectedName: selection.selectedName ?? null,
      allIns: selection.allIns ?? false,
      excludedIds: selection.excludedIds ?? [],
      excludedNames: selection.excludedNames ?? [],
    },
  };
}

export function createMidiOutputModule(
  id: string,
  name: string,
  selection: MidiPortSelection,
): RuntimeModule<ModuleType.MidiOutput> {
  return {
    id,
    name,
    moduleType: EngineModuleType.MidiOutput,
    props: {
      selectedId: selection.selectedId ?? null,
      selectedName: selection.selectedName ?? null,
    },
  };
}

export function createMidiMapperModule(
  id: string,
  name: string,
  props: CompiledInstrumentMidiMapperProps,
): RuntimeModule<ModuleType.MidiMapper> {
  return {
    id,
    name,
    moduleType: EngineModuleType.MidiMapper,
    props,
  };
}

export function createStepSequencerModule(
  id: string,
  name: string,
  trackDocument: InstrumentTrackDocument,
): RuntimeModule<ModuleType.StepSequencer> {
  const compiledPages = trackDocument.sequencer.pages.map((page) => ({
    name: page.name,
    steps: page.steps.map((step) => ({
      active: step.active,
      notes: step.notes.map((note) => ({
        note: note.note,
        velocity: note.velocity,
      })),
      ccMessages: (step.ccMessages ?? []).map((message) => ({ ...message })),
      probability: step.probability,
      microtimeOffset: step.microtimeOffset,
      duration: step.duration,
    })),
  }));

  return {
    id,
    name,
    moduleType: EngineModuleType.StepSequencer,
    props: {
      patterns: [
        {
          name: "A",
          pages: compiledPages,
        },
      ],
      activePatternNo: 0,
      activePageNo: 0,
      loopLength: trackDocument.sequencer.loopLength,
      stepsPerPage: 16,
      resolution: trackDocument.sequencer.resolution,
      playbackMode: trackDocument.sequencer.playbackMode,
      patternSequence: "",
      enableSequence: false,
    },
  };
}

export function createMasterModule(
  id: string,
  name: string,
): RuntimeModule<ModuleType.Master> {
  return {
    id,
    name,
    moduleType: EngineModuleType.Master,
    props: {},
  };
}

export function createTransportControlModule(
  id: string,
  name: string,
  document: InstrumentDocument,
): RuntimeModule<ModuleType.TransportControl> {
  return {
    id,
    name,
    moduleType: EngineModuleType.TransportControl,
    props: {
      bpm: document.globalBlock.tempo,
      swing: document.globalBlock.swing,
    },
  };
}

export function createMasterFilterModule(
  id: string,
  name: string,
  document: InstrumentDocument,
): RuntimeModule<ModuleType.Filter> & { voices: number } {
  return {
    id,
    name,
    moduleType: EngineModuleType.Filter,
    voices: 1,
    props: {
      cutoff: document.globalBlock.masterFilterCutoff,
      envelopeAmount: 0,
      type: "lowpass",
      Q: document.globalBlock.masterFilterResonance,
    },
  };
}

export function createGlobalDelayModule(
  id: string,
  name: string,
  document: InstrumentDocument,
): RuntimeModule<ModuleType.Delay> {
  return {
    id,
    name,
    moduleType: EngineModuleType.Delay,
    props: {
      time: 250,
      timeMode: DelayTimeMode.short,
      sync: false,
      division: "1/4",
      feedback: 0.3,
      mix: document.globalBlock.delaySend,
      stereo: false,
    },
  };
}

export function createGlobalReverbModule(
  id: string,
  name: string,
  document: InstrumentDocument,
): RuntimeModule<ModuleType.Reverb> {
  return {
    id,
    name,
    moduleType: EngineModuleType.Reverb,
    props: {
      mix: document.globalBlock.reverbSend,
      decayTime: 1.5,
      preDelay: 0,
      type: ReverbType.room,
    },
  };
}

export function createMasterVolumeModule(
  id: string,
  name: string,
  document: InstrumentDocument,
): RuntimeModule<ModuleType.Gain> & { voices: number } {
  return {
    id,
    name,
    moduleType: EngineModuleType.Gain,
    voices: 1,
    props: {
      gain: document.globalBlock.masterVolume,
    },
  };
}
