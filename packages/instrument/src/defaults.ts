import {
  PlaybackMode,
  Resolution,
  LFOWaveform,
  OscillatorWave,
  ReverbType,
} from "@blibliki/engine";
import type {
  EffectSlotConfig,
  EffectType,
  GlobalBlock,
  PageBlockId,
  InstrumentControlValue,
  InstrumentDocument,
  SlotConfig,
  SourceProfileId,
  StepConfig,
  StepPageConfig,
  StepSequencerConfig,
  TrackConfig,
  TrackPages,
} from "./types";
import {
  PI_HARDWARE_PROFILE_ID,
  PI_PAGE_SLOT_COUNT,
  INSTRUMENT_VERSION,
  PI_STEP_COUNT,
  PI_STEP_NOTE_COUNT,
  PI_STEP_PAGE_COUNT,
  PI_TEMPLATE_ID,
  PI_TRACK_COUNT,
} from "./types";

const GLOBAL_SLOT_DEFAULTS: Omit<SlotConfig, "slotId">[] = [
  {
    active: true,
    label: "Tempo",
    displayLabel: "BPM",
    target: "global.bpm",
    initialValue: 120,
  },
  {
    active: true,
    label: "Swing",
    displayLabel: "SWG",
    target: "global.swing",
    initialValue: 0.5,
  },
  {
    active: true,
    label: "Master Filter Cutoff",
    displayLabel: "MCF",
    target: "global.masterFilter.cutoff",
    initialValue: 12000,
  },
  {
    active: true,
    label: "Master Filter Resonance",
    displayLabel: "MRQ",
    target: "global.masterFilter.resonance",
    initialValue: 1,
  },
  {
    active: true,
    label: "Global Reverb",
    displayLabel: "REV",
    target: "global.reverb.mix",
    initialValue: 0.2,
  },
  {
    active: true,
    label: "Global Delay",
    displayLabel: "DLY",
    target: "global.delay.mix",
    initialValue: 0.15,
  },
  {
    active: false,
    label: "Inactive",
    displayLabel: "---",
    initialValue: null,
  },
  {
    active: true,
    label: "Main Volume",
    displayLabel: "VOL",
    target: "global.master.volume",
    initialValue: 0.8,
  },
];

const createSlot = (
  slotId: string,
  props: Omit<SlotConfig, "slotId">,
): SlotConfig => ({
  slotId,
  ...props,
});

const createInactiveSlot = (
  slotId: string,
  label = "Inactive",
  displayLabel = "---",
): SlotConfig =>
  createSlot(slotId, {
    active: false,
    label,
    displayLabel,
    initialValue: null,
  });

const createStep = (): StepConfig => ({
  active: false,
  probability: 100,
  duration: "1/16",
  microtimeOffset: 0,
  notes: Array.from({ length: PI_STEP_NOTE_COUNT }, () => ({
    pitch: null,
    velocity: 100,
  })),
});

const createStepPage = (pageNo: number): StepPageConfig => ({
  name: `Page ${pageNo}`,
  steps: Array.from({ length: PI_STEP_COUNT }, createStep),
});

export const createDefaultStepSequencerConfig = (): StepSequencerConfig => ({
  pages: Array.from({ length: PI_STEP_PAGE_COUNT }, (_, index) =>
    createStepPage(index + 1),
  ),
  loopLength: 4,
  resolution: Resolution.sixteenth,
  playbackMode: PlaybackMode.loop,
});

const createAmpPage = (): TrackPages["amp"] => [
  createSlot("amp-0", {
    active: true,
    label: "Level",
    target: "track.amp.level",
    initialValue: 0.8,
  }),
  createSlot("amp-1", {
    active: true,
    label: "Attack",
    target: "track.amp.attack",
    initialValue: 0.1,
  }),
  createSlot("amp-2", {
    active: true,
    label: "Decay",
    target: "track.amp.decay",
    initialValue: 0.1,
  }),
  createSlot("amp-3", {
    active: true,
    label: "Sustain",
    target: "track.amp.sustain",
    initialValue: 0.8,
  }),
  createSlot("amp-4", {
    active: true,
    label: "Release",
    target: "track.amp.release",
    initialValue: 0.2,
  }),
  createSlot("amp-5", {
    active: true,
    label: "Pan",
    target: "track.amp.pan",
    initialValue: 0,
  }),
  createSlot("amp-6", {
    active: true,
    label: "Retrigger",
    target: "track.amp.retrigger",
    initialValue: true,
  }),
  createSlot("amp-7", {
    active: true,
    label: "Velocity",
    target: "track.amp.velocity",
    initialValue: 1,
  }),
];

const createFilterPage = (): TrackPages["filter"] => [
  createSlot("filter-0", {
    active: true,
    label: "Cutoff",
    target: "track.filter.cutoff",
    initialValue: 12000,
  }),
  createSlot("filter-1", {
    active: true,
    label: "Resonance",
    displayLabel: "RES",
    target: "track.filter.resonance",
    initialValue: 1,
  }),
  createSlot("filter-2", {
    active: true,
    label: "Type",
    target: "track.filter.type",
    initialValue: "lowpass",
  }),
  createSlot("filter-3", {
    active: true,
    label: "Amount",
    target: "track.filter.amount",
    initialValue: 0,
  }),
  createSlot("filter-4", {
    active: true,
    label: "Attack",
    target: "track.filter.attack",
    initialValue: 0.05,
  }),
  createSlot("filter-5", {
    active: true,
    label: "Decay",
    target: "track.filter.decay",
    initialValue: 0.2,
  }),
  createSlot("filter-6", {
    active: true,
    label: "Sustain",
    target: "track.filter.sustain",
    initialValue: 0.8,
  }),
  createSlot("filter-7", {
    active: true,
    label: "Release",
    target: "track.filter.release",
    initialValue: 0.2,
  }),
];

const createModPage = (): TrackPages["mod"] => [
  createSlot("mod-0", {
    active: true,
    label: "LFO Select",
    target: "track.mod.selectedLfo",
    initialValue: 1,
  }),
  createSlot("mod-1", {
    active: true,
    label: "Targets",
    target: "track.mod.targetPreset",
    initialValue: "Off",
  }),
  createSlot("mod-2", {
    active: true,
    label: "Waveform",
    target: "track.mod.waveform",
    initialValue: LFOWaveform.sine,
  }),
  createSlot("mod-3", {
    active: true,
    label: "Freq",
    target: "track.mod.frequency",
    initialValue: 1,
  }),
  createSlot("mod-4", {
    active: true,
    label: "Offset",
    target: "track.mod.offset",
    initialValue: 0,
  }),
  createSlot("mod-5", {
    active: true,
    label: "Amount",
    target: "track.mod.amount",
    initialValue: 0,
  }),
  createSlot("mod-6", {
    active: true,
    label: "Sync",
    target: "track.mod.sync",
    initialValue: false,
  }),
  createInactiveSlot("mod-7", "Phase"),
];

const EFFECT_SLOT_TARGETS: Record<
  EffectType,
  [string, string, string, string]
> = {
  delay: [
    "track.fx.time",
    "track.fx.sync",
    "track.fx.feedback",
    "track.fx.mix",
  ],
  reverb: [
    "track.fx.type",
    "track.fx.decay",
    "track.fx.preDelay",
    "track.fx.mix",
  ],
  chorus: [
    "track.fx.rate",
    "track.fx.depth",
    "track.fx.feedback",
    "track.fx.mix",
  ],
  distortion: [
    "track.fx.drive",
    "track.fx.tone",
    "track.fx.unused",
    "track.fx.mix",
  ],
};

const EFFECT_SLOT_DEFAULTS: Record<
  EffectType,
  [
    InstrumentControlValue,
    InstrumentControlValue,
    InstrumentControlValue,
    InstrumentControlValue,
  ]
> = {
  delay: [250, false, 0.3, 0.3],
  reverb: [ReverbType.room, 1.5, 0, 0.25],
  chorus: [0.5, 0.5, 0.2, 0.3],
  distortion: [2, 8000, null, 0.5],
};

const EFFECT_SLOT_LABELS: Record<EffectType, [string, string, string, string]> =
  {
    delay: ["Time", "Sync", "Feedback", "Mix"],
    reverb: ["Type", "Decay", "PreDelay", "Mix"],
    chorus: ["Rate", "Depth", "Feedback", "Mix"],
    distortion: ["Drive", "Tone", "Unused", "Mix"],
  };

const createEffectSlots = (
  effectType: EffectType | null,
  prefix: string,
  effectIndex: number,
): SlotConfig[] => {
  if (!effectType) {
    return Array.from({ length: 4 }, (_, index) =>
      createInactiveSlot(`${prefix}-${index}`),
    );
  }

  const labels = EFFECT_SLOT_LABELS[effectType];
  const targets = EFFECT_SLOT_TARGETS[effectType];
  const defaults = EFFECT_SLOT_DEFAULTS[effectType];

  return labels.map((label, index) =>
    createSlot(`${prefix}-${index}`, {
      active: effectType !== "distortion" || index !== 2,
      label,
      target: targets[index]?.replace("track.fx.", `track.fx.${effectIndex}.`),
      initialValue: defaults[index],
    }),
  );
};

export const createFxPages = (
  effectSlots: EffectSlotConfig[],
): Pick<TrackPages, "fxA" | "fxB"> => {
  const slots = effectSlots.slice(0, 4);
  while (slots.length < 4) {
    slots.push({ slotId: `fx-slot-${slots.length}`, effectType: null });
  }

  return {
    fxA: [
      ...createEffectSlots(slots[0]!.effectType, "fxA-left", 0),
      ...createEffectSlots(slots[1]!.effectType, "fxA-right", 1),
    ],
    fxB: [
      ...createEffectSlots(slots[2]!.effectType, "fxB-left", 2),
      ...createEffectSlots(slots[3]!.effectType, "fxB-right", 3),
    ],
  };
};

const createUnassignedSourcePage = (): TrackPages["source"] =>
  Array.from({ length: PI_PAGE_SLOT_COUNT }, (_, index) =>
    createInactiveSlot(`source-${index}`),
  );

const createSourcePage = (profileId: SourceProfileId): TrackPages["source"] => {
  switch (profileId) {
    case "osc":
      return [
        createSlot("source-0", {
          active: true,
          label: "Wave",
          target: "track.source.wave",
          initialValue: OscillatorWave.sine,
        }),
        createInactiveSlot("source-1"),
        createSlot("source-2", {
          active: true,
          label: "Octave",
          target: "track.source.octave",
          initialValue: 0,
        }),
        createSlot("source-3", {
          active: true,
          label: "Coarse",
          target: "track.source.coarse",
          initialValue: 0,
        }),
        createSlot("source-4", {
          active: true,
          label: "Fine",
          target: "track.source.fine",
          initialValue: 0,
        }),
        createInactiveSlot("source-5"),
        createInactiveSlot("source-6"),
        createInactiveSlot("source-7"),
      ];
    case "3-osc":
      return [
        createSlot("source-0", {
          active: true,
          label: "Shape",
          target: "track.source.3osc.shape",
          initialValue: OscillatorWave.sawtooth,
        }),
        createSlot("source-1", {
          active: true,
          label: "Stack Mode",
          target: "track.source.3osc.stackMode",
          initialValue: "unison",
        }),
        createSlot("source-2", {
          active: true,
          label: "Octave",
          target: "track.source.3osc.octave",
          initialValue: 0,
        }),
        createSlot("source-3", {
          active: true,
          label: "Coarse",
          target: "track.source.3osc.coarse",
          initialValue: 0,
        }),
        createSlot("source-4", {
          active: true,
          label: "Fine",
          target: "track.source.3osc.fine",
          initialValue: 0,
        }),
        createSlot("source-5", {
          active: true,
          label: "Spread",
          target: "track.source.3osc.spread",
          initialValue: 0.1,
        }),
        createSlot("source-6", {
          active: true,
          label: "Blend",
          target: "track.source.3osc.blend",
          initialValue: 0.5,
        }),
        createSlot("source-7", {
          active: true,
          label: "Sub Role",
          target: "track.source.3osc.subRole",
          initialValue: "sub",
        }),
      ];
    case "noise":
      return [
        createSlot("source-0", {
          active: true,
          label: "Type",
          target: "track.source.noise.type",
          initialValue: "white",
        }),
        createSlot("source-1", {
          active: true,
          label: "Color",
          target: "track.source.noise.color",
          initialValue: 8000,
        }),
        createSlot("source-2", {
          active: true,
          label: "Texture",
          target: "track.source.noise.texture",
          initialValue: 2,
        }),
        createInactiveSlot("source-3"),
        createInactiveSlot("source-4"),
        createSlot("source-5", {
          active: true,
          label: "Motion",
          target: "track.source.noise.motion",
          initialValue: 0.5,
        }),
        createSlot("source-6", {
          active: true,
          label: "Stereo",
          target: "track.source.noise.stereo",
          initialValue: 0,
        }),
        createInactiveSlot("source-7"),
      ];
    case "wavetable":
      return [
        createInactiveSlot("source-0", "Table"),
        createSlot("source-1", {
          active: true,
          label: "Position",
          target: "track.source.wavetable.position",
          initialValue: 0,
        }),
        createSlot("source-2", {
          active: true,
          label: "Octave",
          target: "track.source.wavetable.octave",
          initialValue: 0,
        }),
        createSlot("source-3", {
          active: true,
          label: "Coarse",
          target: "track.source.wavetable.coarse",
          initialValue: 0,
        }),
        createSlot("source-4", {
          active: true,
          label: "Fine",
          target: "track.source.wavetable.fine",
          initialValue: 0,
        }),
        createInactiveSlot("source-5"),
        createInactiveSlot("source-6"),
        createInactiveSlot("source-7"),
      ];
    case "unassigned":
      return createUnassignedSourcePage();
  }
};

export const createEffectSlotConfig = (
  effectType: EffectType | null,
  slotNo: number,
): EffectSlotConfig => ({
  slotId: `effect-${slotNo}`,
  effectType,
});

export const createDefaultEffectSlots = (): EffectSlotConfig[] =>
  Array.from({ length: 4 }, (_, index) => createEffectSlotConfig(null, index));

export const createTrackPages = (
  sourceProfileId: SourceProfileId,
  effectSlots: EffectSlotConfig[],
): TrackPages => ({
  source: createSourcePage(sourceProfileId),
  amp: createAmpPage(),
  filter: createFilterPage(),
  mod: createModPage(),
  ...createFxPages(effectSlots),
});

export const createDefaultTrack = (trackNo: number): TrackConfig => {
  const effectSlots = createDefaultEffectSlots();
  return {
    name: undefined,
    noteSource: "stepSequencer",
    midiChannel: trackNo,
    sourceProfileId: "unassigned",
    effectSlots,
    pages: createTrackPages("unassigned", effectSlots),
    stepSequencer: createDefaultStepSequencerConfig(),
  };
};

export const createDefaultGlobalBlock = (): GlobalBlock => ({
  slots: GLOBAL_SLOT_DEFAULTS.map((slot, index) =>
    createSlot(`global-${index}`, slot),
  ),
});

export const createDefaultInstrumentDocument = (
  name = "Untitled",
): InstrumentDocument => ({
  version: INSTRUMENT_VERSION,
  name,
  templateId: PI_TEMPLATE_ID,
  hardwareProfileId: PI_HARDWARE_PROFILE_ID,
  globalBlock: createDefaultGlobalBlock(),
  tracks: Array.from({ length: PI_TRACK_COUNT }, (_, index) =>
    createDefaultTrack(index + 1),
  ),
});

export const withTrackSourceProfile = (
  track: TrackConfig,
  sourceProfileId: SourceProfileId,
): TrackConfig => {
  const next = structuredClone(track);
  next.sourceProfileId = sourceProfileId;
  next.pages = {
    ...next.pages,
    source: createSourcePage(sourceProfileId),
  };
  return next;
};

export const withTrackEffectType = (
  track: TrackConfig,
  effectIndex: number,
  effectType: EffectType | null,
): TrackConfig => {
  const next = structuredClone(track);
  next.effectSlots[effectIndex] = createEffectSlotConfig(
    effectType,
    effectIndex,
  );
  const fxPages = createFxPages(next.effectSlots);
  next.pages = {
    ...next.pages,
    ...fxPages,
  };
  return next;
};

export const PAGE_LABELS: Record<number, string> = {
  0: "Src/Amp",
  1: "Flt/Mod",
  2: "FX A/B",
};

export const TRACK_PAGE_BLOCKS: Record<number, [PageBlockId, PageBlockId]> = {
  0: ["source", "amp"],
  1: ["filter", "mod"],
  2: ["fxA", "fxB"],
};
