import {
  ModuleType,
  moduleSchemas,
  LFOWaveform,
  OscillatorWave,
  PlaybackMode,
  Resolution,
  type IAnyModuleSerialize,
  type IEngineSerialize,
  type NumberProp,
  type EnumProp,
  type BooleanProp,
  type PropSchema,
  type IRoute,
  ReverbType,
  DelayTimeMode,
  NoiseType,
} from "@blibliki/engine";
import {
  buildInstrumentMidiMapperProps,
  INSTRUMENT_CONTROLLER_NAME,
  INSTRUMENT_MIDI_IN_ID,
  INSTRUMENT_MIDI_MAPPER_ID,
  INSTRUMENT_MIDI_OUT_ID,
} from "./midiMapper";
import type {
  BindingTransform,
  InstrumentCompileResult,
  InstrumentDocument,
  InstrumentControlValue,
  ResolvedBinding,
  SessionControlSpec,
  SlotConfig,
  TrackConfig,
  TrackRuntimeMetadata,
} from "./types";
import { PI_STEP_NOTE_COUNT, PI_TRACK_COUNT } from "./types";

type CompileContext = {
  modules: IAnyModuleSerialize[];
  routes: IRoute[];
  bindings: Record<string, ResolvedBinding>;
  tracks: TrackRuntimeMetadata[];
};

type ModuleSeed = {
  id: string;
  name: string;
  moduleType: ModuleType;
  props: Record<string, unknown>;
  voices?: number;
};

const createModule = ({
  id,
  name,
  moduleType,
  props,
  voices,
}: ModuleSeed): IAnyModuleSerialize =>
  ({
    id,
    name,
    moduleType,
    props,
    inputs: [],
    outputs: [],
    ...(voices === undefined ? {} : { voices }),
  }) as IAnyModuleSerialize;

const createRoute = (
  id: string,
  sourceModuleId: string,
  sourceIo: string,
  destinationModuleId: string,
  destinationIo: string,
): IRoute => ({
  id,
  source: { moduleId: sourceModuleId, ioName: sourceIo },
  destination: { moduleId: destinationModuleId, ioName: destinationIo },
});

const getTrackVoices = (track: TrackConfig) =>
  Math.min(PI_STEP_NOTE_COUNT, Math.max(1, Math.trunc(track.voices || 0)));

const namespacedTrackTarget = (trackIndex: number, target: string) =>
  target.replace(/^track\./, `track.${trackIndex}.`);

const toNumberControl = (
  schema: NumberProp,
  label: string,
): NumberProp & { kind: "number" } => ({
  kind: "number",
  label,
  min: schema.min ?? 0,
  max: schema.max ?? 1,
  step: schema.step ?? 0.01,
  ...(schema.exp === undefined ? {} : { exp: schema.exp }),
});

const toEnumControl = (
  schema: EnumProp<string | number>,
  label: string,
): EnumProp<string | number> & { kind: "enum" } => ({
  kind: "enum",
  label,
  options: [...schema.options],
});

const toBooleanControl = (
  label: string,
): BooleanProp & { kind: "boolean" } => ({
  kind: "boolean",
  label,
});

const toControlSpec = (
  moduleType: ModuleType,
  propName: string,
  label: string,
): SessionControlSpec => {
  const schema = (moduleSchemas[moduleType] as Record<string, PropSchema>)[
    propName
  ];

  if (!schema) {
    throw new Error(`Unknown prop schema for ${moduleType}.${propName}`);
  }

  switch (schema.kind) {
    case "number":
      return toNumberControl(schema, label);
    case "enum":
      return toEnumControl(schema, label);
    case "boolean":
      return toBooleanControl(label);
    default:
      throw new Error(
        `Unsupported control schema ${schema.kind} for ${moduleType}.${propName}`,
      );
  }
};

const getSlotValue = (
  slot: SlotConfig,
  fallback: InstrumentControlValue,
): InstrumentControlValue => slot.initialValue ?? fallback;

const pushModule = (context: CompileContext, seed: ModuleSeed) => {
  context.modules.push(createModule(seed));
};

const pushRoute = (
  context: CompileContext,
  id: string,
  sourceModuleId: string,
  sourceIo: string,
  destinationModuleId: string,
  destinationIo: string,
) => {
  context.routes.push(
    createRoute(
      id,
      sourceModuleId,
      sourceIo,
      destinationModuleId,
      destinationIo,
    ),
  );
};

const pushModuleBinding = (
  context: CompileContext,
  bindingKey: string,
  binding: ResolvedBinding,
) => {
  context.bindings[bindingKey] = binding;
};

const addModulePropBinding = ({
  context,
  bindingKey,
  label,
  moduleId,
  moduleType,
  propName,
  transform,
}: {
  context: CompileContext;
  bindingKey: string;
  label: string;
  moduleId: string;
  moduleType: ModuleType;
  propName: string;
  transform?: BindingTransform;
}) => {
  const existing = context.bindings[bindingKey];

  if (existing?.kind === "module") {
    existing.targets.push({ moduleId, moduleType, propName, transform });
    return;
  }

  pushModuleBinding(context, bindingKey, {
    kind: "module",
    control: toControlSpec(moduleType, propName, label),
    targets: [{ moduleId, moduleType, propName, transform }],
  });
};

const addSessionBinding = (
  context: CompileContext,
  bindingKey: string,
  control: SessionControlSpec,
  sessionKey: string,
) => {
  pushModuleBinding(context, bindingKey, {
    kind: "session",
    control,
    sessionKey,
  });
};

const addTransportBinding = (
  context: CompileContext,
  bindingKey: string,
  control: SessionControlSpec,
  transportProp: "bpm" | "swingAmount",
) => {
  pushModuleBinding(context, bindingKey, {
    kind: "transport",
    control,
    transportProp,
  });
};

const compileGlobalBlock = (
  context: CompileContext,
  document: InstrumentDocument,
) => {
  const masterFilterId = "global-master-filter";
  const globalReverbId = "global-reverb";
  const globalDelayId = "global-delay";
  const masterVolumeId = "global-master-volume";
  const masterId = "global-master-out";

  const slots = document.globalBlock.slots;

  pushModule(context, {
    id: masterFilterId,
    name: "Master Filter",
    moduleType: ModuleType.Filter,
    voices: 1,
    props: {
      cutoff: getSlotValue(slots[2]!, 12000),
      Q: getSlotValue(slots[3]!, 1),
      type: "lowpass",
      envelopeAmount: 0,
    },
  });

  pushModule(context, {
    id: globalReverbId,
    name: "Global Reverb",
    moduleType: ModuleType.Reverb,
    props: {
      mix: getSlotValue(slots[4]!, 0.2),
      decayTime: 1.5,
      preDelay: 0,
      type: ReverbType.room,
    },
  });

  pushModule(context, {
    id: globalDelayId,
    name: "Global Delay",
    moduleType: ModuleType.Delay,
    props: {
      mix: getSlotValue(slots[5]!, 0.15),
      time: 250,
      timeMode: DelayTimeMode.short,
      sync: false,
      division: "1/4",
      feedback: 0.3,
      stereo: false,
    },
  });

  pushModule(context, {
    id: masterVolumeId,
    name: "Master Volume",
    moduleType: ModuleType.Gain,
    voices: 1,
    props: {
      gain: getSlotValue(slots[7]!, 0.8),
    },
  });

  pushModule(context, {
    id: masterId,
    name: "Master",
    moduleType: ModuleType.Master,
    props: {},
  });

  pushRoute(
    context,
    "route-global-master-filter-reverb",
    masterFilterId,
    "out",
    globalReverbId,
    "in",
  );
  pushRoute(
    context,
    "route-global-reverb-delay",
    globalReverbId,
    "out",
    globalDelayId,
    "in",
  );
  pushRoute(
    context,
    "route-global-delay-volume",
    globalDelayId,
    "out",
    masterVolumeId,
    "in",
  );
  pushRoute(
    context,
    "route-global-volume-master",
    masterVolumeId,
    "out",
    masterId,
    "in",
  );

  addTransportBinding(
    context,
    "global.bpm",
    {
      kind: "number",
      label: "Tempo",
      min: 40,
      max: 240,
      step: 1,
    },
    "bpm",
  );

  addTransportBinding(
    context,
    "global.swing",
    {
      kind: "number",
      label: "Swing",
      min: 0.5,
      max: 0.75,
      step: 0.01,
    },
    "swingAmount",
  );

  addModulePropBinding({
    context,
    bindingKey: "global.masterFilter.cutoff",
    label: "Master Filter Cutoff",
    moduleId: masterFilterId,
    moduleType: ModuleType.Filter,
    propName: "cutoff",
  });
  addModulePropBinding({
    context,
    bindingKey: "global.masterFilter.resonance",
    label: "Master Filter Resonance",
    moduleId: masterFilterId,
    moduleType: ModuleType.Filter,
    propName: "Q",
  });
  addModulePropBinding({
    context,
    bindingKey: "global.reverb.mix",
    label: "Global Reverb",
    moduleId: globalReverbId,
    moduleType: ModuleType.Reverb,
    propName: "mix",
  });
  addModulePropBinding({
    context,
    bindingKey: "global.delay.mix",
    label: "Global Delay",
    moduleId: globalDelayId,
    moduleType: ModuleType.Delay,
    propName: "mix",
  });
  addModulePropBinding({
    context,
    bindingKey: "global.master.volume",
    label: "Master Volume",
    moduleId: masterVolumeId,
    moduleType: ModuleType.Gain,
    propName: "gain",
  });
};

const compileTrackSource = ({
  context,
  track,
  trackIndex,
  ampGainId,
}: {
  context: CompileContext;
  track: TrackConfig;
  trackIndex: number;
  ampGainId: string;
}) => {
  const prefix = `track-${trackIndex + 1}`;
  const slots = track.pages.source;
  const voices = getTrackVoices(track);

  switch (track.sourceProfileId) {
    case "unassigned":
      return;
    case "osc": {
      const oscId = `${prefix}-source-osc`;
      pushModule(context, {
        id: oscId,
        name: `${prefix} Osc`,
        moduleType: ModuleType.Oscillator,
        voices,
        props: {
          wave: getSlotValue(slots[0]!, OscillatorWave.sine),
          octave: getSlotValue(slots[2]!, 0),
          coarse: getSlotValue(slots[3]!, 0),
          fine: getSlotValue(slots[4]!, 0),
          frequency: 440,
          lowGain: false,
        },
      });
      pushRoute(
        context,
        `${prefix}-route-source-amp`,
        oscId,
        "out",
        ampGainId,
        "in",
      );
      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(trackIndex, "track.source.wave"),
        label: "Wave",
        moduleId: oscId,
        moduleType: ModuleType.Oscillator,
        propName: "wave",
      });
      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(trackIndex, "track.source.octave"),
        label: "Octave",
        moduleId: oscId,
        moduleType: ModuleType.Oscillator,
        propName: "octave",
      });
      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(trackIndex, "track.source.coarse"),
        label: "Coarse",
        moduleId: oscId,
        moduleType: ModuleType.Oscillator,
        propName: "coarse",
      });
      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(trackIndex, "track.source.fine"),
        label: "Fine",
        moduleId: oscId,
        moduleType: ModuleType.Oscillator,
        propName: "fine",
      });
      return;
    }
    case "wavetable": {
      const wavetableId = `${prefix}-source-wavetable`;
      pushModule(context, {
        id: wavetableId,
        name: `${prefix} Wavetable`,
        moduleType: ModuleType.Wavetable,
        voices,
        props: {
          position: getSlotValue(slots[1]!, 0),
          octave: getSlotValue(slots[2]!, 0),
          coarse: getSlotValue(slots[3]!, 0),
          fine: getSlotValue(slots[4]!, 0),
          frequency: 440,
          lowGain: false,
        },
      });
      pushRoute(
        context,
        `${prefix}-route-source-amp`,
        wavetableId,
        "out",
        ampGainId,
        "in",
      );
      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(
          trackIndex,
          "track.source.wavetable.position",
        ),
        label: "Position",
        moduleId: wavetableId,
        moduleType: ModuleType.Wavetable,
        propName: "position",
      });
      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(
          trackIndex,
          "track.source.wavetable.octave",
        ),
        label: "Octave",
        moduleId: wavetableId,
        moduleType: ModuleType.Wavetable,
        propName: "octave",
      });
      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(
          trackIndex,
          "track.source.wavetable.coarse",
        ),
        label: "Coarse",
        moduleId: wavetableId,
        moduleType: ModuleType.Wavetable,
        propName: "coarse",
      });
      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(
          trackIndex,
          "track.source.wavetable.fine",
        ),
        label: "Fine",
        moduleId: wavetableId,
        moduleType: ModuleType.Wavetable,
        propName: "fine",
      });
      return;
    }
    case "noise": {
      const noiseId = `${prefix}-source-noise`;
      const colorFilterId = `${prefix}-source-noise-filter`;
      const textureId = `${prefix}-source-noise-texture`;
      const motionId = `${prefix}-source-noise-motion`;
      const stereoId = `${prefix}-source-noise-stereo`;

      pushModule(context, {
        id: noiseId,
        name: `${prefix} Noise`,
        moduleType: ModuleType.Noise,
        props: {
          type: getSlotValue(slots[0]!, NoiseType.white),
        },
      });
      pushModule(context, {
        id: colorFilterId,
        name: `${prefix} Noise Color`,
        moduleType: ModuleType.Filter,
        voices: 1,
        props: {
          cutoff: getSlotValue(slots[1]!, 8000),
          Q: 1,
          type: "lowpass",
          envelopeAmount: 0,
        },
      });
      pushModule(context, {
        id: textureId,
        name: `${prefix} Noise Texture`,
        moduleType: ModuleType.Distortion,
        voices: 1,
        props: {
          drive: getSlotValue(slots[2]!, 2),
          tone: 8000,
          mix: 0.6,
        },
      });
      pushModule(context, {
        id: motionId,
        name: `${prefix} Noise Motion`,
        moduleType: ModuleType.Chorus,
        props: {
          rate: getSlotValue(slots[5]!, 0.5),
          depth: 0.35,
          feedback: 0.1,
          mix: 0.3,
        },
      });
      pushModule(context, {
        id: stereoId,
        name: `${prefix} Noise Stereo`,
        moduleType: ModuleType.StereoPanner,
        voices: 1,
        props: {
          pan: getSlotValue(slots[6]!, 0),
        },
      });

      pushRoute(
        context,
        `${prefix}-route-noise-color`,
        noiseId,
        "out",
        colorFilterId,
        "in",
      );
      pushRoute(
        context,
        `${prefix}-route-noise-texture`,
        colorFilterId,
        "out",
        textureId,
        "in",
      );
      pushRoute(
        context,
        `${prefix}-route-noise-motion`,
        textureId,
        "out",
        motionId,
        "in",
      );
      pushRoute(
        context,
        `${prefix}-route-noise-stereo`,
        motionId,
        "out",
        stereoId,
        "in",
      );
      pushRoute(
        context,
        `${prefix}-route-noise-amp`,
        stereoId,
        "out",
        ampGainId,
        "in",
      );

      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(
          trackIndex,
          "track.source.noise.type",
        ),
        label: "Type",
        moduleId: noiseId,
        moduleType: ModuleType.Noise,
        propName: "type",
      });
      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(
          trackIndex,
          "track.source.noise.color",
        ),
        label: "Color",
        moduleId: colorFilterId,
        moduleType: ModuleType.Filter,
        propName: "cutoff",
      });
      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(
          trackIndex,
          "track.source.noise.texture",
        ),
        label: "Texture",
        moduleId: textureId,
        moduleType: ModuleType.Distortion,
        propName: "drive",
      });
      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(
          trackIndex,
          "track.source.noise.motion",
        ),
        label: "Motion",
        moduleId: motionId,
        moduleType: ModuleType.Chorus,
        propName: "rate",
      });
      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(
          trackIndex,
          "track.source.noise.stereo",
        ),
        label: "Stereo",
        moduleId: stereoId,
        moduleType: ModuleType.StereoPanner,
        propName: "pan",
      });
      return;
    }
    case "3-osc": {
      const osc1Id = `${prefix}-source-3osc-1`;
      const osc2Id = `${prefix}-source-3osc-2`;
      const osc3Id = `${prefix}-source-3osc-3`;
      const gain1Id = `${prefix}-source-3osc-gain-1`;
      const gain2Id = `${prefix}-source-3osc-gain-2`;
      const gain3Id = `${prefix}-source-3osc-gain-3`;

      [osc1Id, osc2Id, osc3Id].forEach((id, index) => {
        pushModule(context, {
          id,
          name: `${prefix} 3-Osc ${index + 1}`,
          moduleType: ModuleType.Oscillator,
          voices,
          props: {
            wave: getSlotValue(slots[0]!, OscillatorWave.sawtooth),
            octave: getSlotValue(slots[2]!, 0),
            coarse: getSlotValue(slots[3]!, 0),
            fine: getSlotValue(slots[4]!, 0),
            frequency: 440,
            lowGain: false,
          },
        });
      });
      [gain1Id, gain2Id, gain3Id].forEach((id, index) => {
        pushModule(context, {
          id,
          name: `${prefix} 3-Osc Mix ${index + 1}`,
          moduleType: ModuleType.Gain,
          voices,
          props: {
            gain: index === 0 ? 1 : 0.5,
          },
        });
      });

      pushRoute(
        context,
        `${prefix}-route-3osc-1-gain`,
        osc1Id,
        "out",
        gain1Id,
        "in",
      );
      pushRoute(
        context,
        `${prefix}-route-3osc-2-gain`,
        osc2Id,
        "out",
        gain2Id,
        "in",
      );
      pushRoute(
        context,
        `${prefix}-route-3osc-3-gain`,
        osc3Id,
        "out",
        gain3Id,
        "in",
      );
      pushRoute(
        context,
        `${prefix}-route-3osc-mix-1`,
        gain1Id,
        "out",
        ampGainId,
        "in",
      );
      pushRoute(
        context,
        `${prefix}-route-3osc-mix-2`,
        gain2Id,
        "out",
        ampGainId,
        "in",
      );
      pushRoute(
        context,
        `${prefix}-route-3osc-mix-3`,
        gain3Id,
        "out",
        ampGainId,
        "in",
      );

      const shapeKey = namespacedTrackTarget(
        trackIndex,
        "track.source.3osc.shape",
      );
      [osc1Id, osc2Id, osc3Id].forEach((moduleId) => {
        addModulePropBinding({
          context,
          bindingKey: shapeKey,
          label: "Shape",
          moduleId,
          moduleType: ModuleType.Oscillator,
          propName: "wave",
        });
      });

      [osc1Id, osc2Id, osc3Id].forEach((moduleId) => {
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            "track.source.3osc.octave",
          ),
          label: "Octave",
          moduleId,
          moduleType: ModuleType.Oscillator,
          propName: "octave",
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            "track.source.3osc.coarse",
          ),
          label: "Coarse",
          moduleId,
          moduleType: ModuleType.Oscillator,
          propName: "coarse",
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            "track.source.3osc.fine",
          ),
          label: "Fine",
          moduleId,
          moduleType: ModuleType.Oscillator,
          propName: "fine",
        });
      });

      addSessionBinding(
        context,
        namespacedTrackTarget(trackIndex, "track.source.3osc.stackMode"),
        {
          kind: "enum",
          label: "Stack Mode",
          options: ["unison", "octave", "fifths"],
        },
        `track.${trackIndex}.3osc.stackMode`,
      );

      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(
          trackIndex,
          "track.source.3osc.spread",
        ),
        label: "Spread",
        moduleId: osc2Id,
        moduleType: ModuleType.Oscillator,
        propName: "fine",
        transform: { type: "linear", scale: 1, offset: 0 },
      });
      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(
          trackIndex,
          "track.source.3osc.spread",
        ),
        label: "Spread",
        moduleId: osc3Id,
        moduleType: ModuleType.Oscillator,
        propName: "fine",
        transform: { type: "linear", scale: -1, offset: 0 },
      });
      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(
          trackIndex,
          "track.source.3osc.blend",
        ),
        label: "Blend",
        moduleId: gain2Id,
        moduleType: ModuleType.Gain,
        propName: "gain",
        transform: { type: "linear", scale: 1, offset: 0 },
      });
      addModulePropBinding({
        context,
        bindingKey: namespacedTrackTarget(
          trackIndex,
          "track.source.3osc.blend",
        ),
        label: "Blend",
        moduleId: gain3Id,
        moduleType: ModuleType.Gain,
        propName: "gain",
        transform: { type: "linear", scale: -1, offset: 1 },
      });

      addSessionBinding(
        context,
        namespacedTrackTarget(trackIndex, "track.source.3osc.subRole"),
        {
          kind: "enum",
          label: "Sub Role",
          options: ["off", "sub", "fifth"],
        },
        `track.${trackIndex}.3osc.subRole`,
      );
      return;
    }
  }
};

const compileTrack = (
  context: CompileContext,
  track: TrackConfig,
  trackIndex: number,
) => {
  const prefix = `track-${trackIndex + 1}`;
  const noteSourceModuleId = `${prefix}-note-source`;
  const ampEnvId = `${prefix}-amp-env`;
  const ampGainId = `${prefix}-amp-gain`;
  const filterEnvId = `${prefix}-filter-env`;
  const filterId = `${prefix}-filter`;
  const panId = `${prefix}-pan`;
  const finalGainId = `${prefix}-final-gain`;
  const lfoId = `${prefix}-lfo-1`;
  const voices = getTrackVoices(track);

  if (track.noteSource === "stepSequencer") {
    pushModule(context, {
      id: noteSourceModuleId,
      name: `${prefix} Step Sequencer`,
      moduleType: ModuleType.StepSequencer,
      props: {
        patterns: [
          {
            name: "A",
            pages: track.stepSequencer?.pages ?? [],
          },
        ],
        activePatternNo: 0,
        activePageNo: 0,
        stepsPerPage: 16,
        resolution: track.stepSequencer?.resolution ?? Resolution.sixteenth,
        playbackMode: track.stepSequencer?.playbackMode ?? PlaybackMode.loop,
        patternSequence: "",
        enableSequence: false,
      },
    });
  } else {
    pushModule(context, {
      id: noteSourceModuleId,
      name: `${prefix} External MIDI`,
      moduleType: ModuleType.VirtualMidi,
      props: {
        activeNotes: [],
      },
    });
  }

  pushModule(context, {
    id: ampEnvId,
    name: `${prefix} Amp Envelope`,
    moduleType: ModuleType.Envelope,
    voices,
    props: {
      attack: getSlotValue(track.pages.amp[1]!, 0.1),
      decay: getSlotValue(track.pages.amp[2]!, 0.1),
      sustain: getSlotValue(track.pages.amp[3]!, 0.8),
      release: getSlotValue(track.pages.amp[4]!, 0.2),
      attackCurve: 0.5,
    },
  });

  pushModule(context, {
    id: ampGainId,
    name: `${prefix} Amp`,
    moduleType: ModuleType.Gain,
    voices,
    props: {
      gain: getSlotValue(track.pages.amp[0]!, 0.8),
    },
  });

  pushModule(context, {
    id: filterEnvId,
    name: `${prefix} Filter Envelope`,
    moduleType: ModuleType.Envelope,
    voices,
    props: {
      attack: getSlotValue(track.pages.filter[4]!, 0.05),
      decay: getSlotValue(track.pages.filter[5]!, 0.2),
      sustain: getSlotValue(track.pages.filter[6]!, 0.8),
      release: getSlotValue(track.pages.filter[7]!, 0.2),
      attackCurve: 0.5,
    },
  });

  pushModule(context, {
    id: filterId,
    name: `${prefix} Filter`,
    moduleType: ModuleType.Filter,
    voices,
    props: {
      cutoff: getSlotValue(track.pages.filter[0]!, 12000),
      Q: getSlotValue(track.pages.filter[1]!, 1),
      type: getSlotValue(track.pages.filter[2]!, "lowpass"),
      envelopeAmount: getSlotValue(track.pages.filter[3]!, 0),
    },
  });

  pushModule(context, {
    id: panId,
    name: `${prefix} Pan`,
    moduleType: ModuleType.StereoPanner,
    voices,
    props: {
      pan: getSlotValue(track.pages.amp[5]!, 0),
    },
  });

  pushModule(context, {
    id: lfoId,
    name: `${prefix} LFO`,
    moduleType: ModuleType.LFO,
    voices: 1,
    props: {
      waveform: getSlotValue(track.pages.mod[2]!, LFOWaveform.sine),
      frequency: getSlotValue(track.pages.mod[3]!, 1),
      offset: getSlotValue(track.pages.mod[4]!, 0),
      amount: getSlotValue(track.pages.mod[5]!, 0),
      sync: getSlotValue(track.pages.mod[6]!, false),
      division: "1/4",
    },
  });

  pushModule(context, {
    id: finalGainId,
    name: `${prefix} Final Gain`,
    moduleType: ModuleType.Gain,
    voices: 1,
    props: {
      gain: 1,
    },
  });

  pushRoute(
    context,
    `${prefix}-route-amp-env-gain`,
    ampEnvId,
    "out",
    ampGainId,
    "gain",
  );
  pushRoute(
    context,
    `${prefix}-route-filter-env-filter`,
    filterEnvId,
    "out",
    filterId,
    "cutoffMod",
  );

  compileTrackSource({ context, track, trackIndex, ampGainId });

  pushRoute(
    context,
    `${prefix}-route-amp-filter`,
    ampGainId,
    "out",
    filterId,
    "in",
  );
  pushRoute(
    context,
    `${prefix}-route-filter-pan`,
    filterId,
    "out",
    panId,
    "in",
  );

  let currentOutModuleId = panId;
  track.effectSlots.forEach((effectSlot, effectIndex) => {
    if (!effectSlot.effectType) return;

    const moduleId = `${prefix}-fx-${effectIndex + 1}`;
    const page = effectIndex < 2 ? track.pages.fxA : track.pages.fxB;
    const baseIndex = effectIndex % 2 === 0 ? 0 : 4;

    switch (effectSlot.effectType) {
      case "delay":
        pushModule(context, {
          id: moduleId,
          name: `${prefix} Delay ${effectIndex + 1}`,
          moduleType: ModuleType.Delay,
          props: {
            time: getSlotValue(page[baseIndex]!, 250),
            sync: getSlotValue(page[baseIndex + 1]!, false),
            feedback: getSlotValue(page[baseIndex + 2]!, 0.3),
            mix: getSlotValue(page[baseIndex + 3]!, 0.3),
            timeMode: DelayTimeMode.short,
            division: "1/4",
            stereo: false,
          },
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            `track.fx.${effectIndex}.time`,
          ),
          label: "Time",
          moduleId,
          moduleType: ModuleType.Delay,
          propName: "time",
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            `track.fx.${effectIndex}.sync`,
          ),
          label: "Sync",
          moduleId,
          moduleType: ModuleType.Delay,
          propName: "sync",
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            `track.fx.${effectIndex}.feedback`,
          ),
          label: "Feedback",
          moduleId,
          moduleType: ModuleType.Delay,
          propName: "feedback",
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            `track.fx.${effectIndex}.mix`,
          ),
          label: "Mix",
          moduleId,
          moduleType: ModuleType.Delay,
          propName: "mix",
        });
        break;
      case "reverb":
        pushModule(context, {
          id: moduleId,
          name: `${prefix} Reverb ${effectIndex + 1}`,
          moduleType: ModuleType.Reverb,
          props: {
            type: getSlotValue(page[baseIndex]!, ReverbType.room),
            decayTime: getSlotValue(page[baseIndex + 1]!, 1.5),
            preDelay: getSlotValue(page[baseIndex + 2]!, 0),
            mix: getSlotValue(page[baseIndex + 3]!, 0.25),
          },
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            `track.fx.${effectIndex}.type`,
          ),
          label: "Type",
          moduleId,
          moduleType: ModuleType.Reverb,
          propName: "type",
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            `track.fx.${effectIndex}.decay`,
          ),
          label: "Decay",
          moduleId,
          moduleType: ModuleType.Reverb,
          propName: "decayTime",
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            `track.fx.${effectIndex}.preDelay`,
          ),
          label: "PreDelay",
          moduleId,
          moduleType: ModuleType.Reverb,
          propName: "preDelay",
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            `track.fx.${effectIndex}.mix`,
          ),
          label: "Mix",
          moduleId,
          moduleType: ModuleType.Reverb,
          propName: "mix",
        });
        break;
      case "chorus":
        pushModule(context, {
          id: moduleId,
          name: `${prefix} Chorus ${effectIndex + 1}`,
          moduleType: ModuleType.Chorus,
          props: {
            rate: getSlotValue(page[baseIndex]!, 0.5),
            depth: getSlotValue(page[baseIndex + 1]!, 0.5),
            feedback: getSlotValue(page[baseIndex + 2]!, 0.2),
            mix: getSlotValue(page[baseIndex + 3]!, 0.3),
          },
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            `track.fx.${effectIndex}.rate`,
          ),
          label: "Rate",
          moduleId,
          moduleType: ModuleType.Chorus,
          propName: "rate",
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            `track.fx.${effectIndex}.depth`,
          ),
          label: "Depth",
          moduleId,
          moduleType: ModuleType.Chorus,
          propName: "depth",
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            `track.fx.${effectIndex}.feedback`,
          ),
          label: "Feedback",
          moduleId,
          moduleType: ModuleType.Chorus,
          propName: "feedback",
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            `track.fx.${effectIndex}.mix`,
          ),
          label: "Mix",
          moduleId,
          moduleType: ModuleType.Chorus,
          propName: "mix",
        });
        break;
      case "distortion":
        pushModule(context, {
          id: moduleId,
          name: `${prefix} Distortion ${effectIndex + 1}`,
          moduleType: ModuleType.Distortion,
          voices,
          props: {
            drive: getSlotValue(page[baseIndex]!, 2),
            tone: getSlotValue(page[baseIndex + 1]!, 8000),
            mix: getSlotValue(page[baseIndex + 3]!, 0.5),
          },
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            `track.fx.${effectIndex}.drive`,
          ),
          label: "Drive",
          moduleId,
          moduleType: ModuleType.Distortion,
          propName: "drive",
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            `track.fx.${effectIndex}.tone`,
          ),
          label: "Tone",
          moduleId,
          moduleType: ModuleType.Distortion,
          propName: "tone",
        });
        addModulePropBinding({
          context,
          bindingKey: namespacedTrackTarget(
            trackIndex,
            `track.fx.${effectIndex}.mix`,
          ),
          label: "Mix",
          moduleId,
          moduleType: ModuleType.Distortion,
          propName: "mix",
        });
        break;
    }

    pushRoute(
      context,
      `${prefix}-route-fx-${effectIndex}`,
      currentOutModuleId,
      "out",
      moduleId,
      "in",
    );
    currentOutModuleId = moduleId;
  });

  pushRoute(
    context,
    `${prefix}-route-final-gain`,
    currentOutModuleId,
    "out",
    finalGainId,
    "in",
  );
  pushRoute(
    context,
    `${prefix}-route-final-master`,
    finalGainId,
    "out",
    "global-master-filter",
    "in",
  );

  const noteSourceMidiOutName =
    track.noteSource === "stepSequencer" ? "midi" : "midi out";

  pushRoute(
    context,
    `${prefix}-route-note-source-source`,
    noteSourceModuleId,
    noteSourceMidiOutName,
    ampEnvId,
    "midi in",
  );
  pushRoute(
    context,
    `${prefix}-route-note-source-filter-env`,
    noteSourceModuleId,
    noteSourceMidiOutName,
    filterEnvId,
    "midi in",
  );

  const midiTargetPrefix =
    track.sourceProfileId === "wavetable"
      ? `${prefix}-source-wavetable`
      : track.sourceProfileId === "osc"
        ? `${prefix}-source-osc`
        : track.sourceProfileId === "noise"
          ? undefined
          : track.sourceProfileId === "3-osc"
            ? `${prefix}-source-3osc-1`
            : undefined;

  if (midiTargetPrefix) {
    pushRoute(
      context,
      `${prefix}-route-note-source-primary`,
      noteSourceModuleId,
      noteSourceMidiOutName,
      midiTargetPrefix,
      "midi in",
    );
  }
  if (track.sourceProfileId === "3-osc") {
    pushRoute(
      context,
      `${prefix}-route-note-source-3osc-2`,
      noteSourceModuleId,
      noteSourceMidiOutName,
      `${prefix}-source-3osc-2`,
      "midi in",
    );
    pushRoute(
      context,
      `${prefix}-route-note-source-3osc-3`,
      noteSourceModuleId,
      noteSourceMidiOutName,
      `${prefix}-source-3osc-3`,
      "midi in",
    );
  }

  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.amp.level"),
    label: "Level",
    moduleId: ampGainId,
    moduleType: ModuleType.Gain,
    propName: "gain",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.amp.attack"),
    label: "Attack",
    moduleId: ampEnvId,
    moduleType: ModuleType.Envelope,
    propName: "attack",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.amp.decay"),
    label: "Decay",
    moduleId: ampEnvId,
    moduleType: ModuleType.Envelope,
    propName: "decay",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.amp.sustain"),
    label: "Sustain",
    moduleId: ampEnvId,
    moduleType: ModuleType.Envelope,
    propName: "sustain",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.amp.release"),
    label: "Release",
    moduleId: ampEnvId,
    moduleType: ModuleType.Envelope,
    propName: "release",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.amp.pan"),
    label: "Pan",
    moduleId: panId,
    moduleType: ModuleType.StereoPanner,
    propName: "pan",
  });
  addSessionBinding(
    context,
    namespacedTrackTarget(trackIndex, "track.amp.retrigger"),
    {
      kind: "boolean",
      label: "Retrigger",
    },
    `track.${trackIndex}.amp.retrigger`,
  );
  addSessionBinding(
    context,
    namespacedTrackTarget(trackIndex, "track.amp.velocity"),
    {
      kind: "number",
      label: "Velocity",
      min: 0,
      max: 1,
      step: 0.01,
    },
    `track.${trackIndex}.amp.velocity`,
  );

  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.filter.cutoff"),
    label: "Cutoff",
    moduleId: filterId,
    moduleType: ModuleType.Filter,
    propName: "cutoff",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.filter.resonance"),
    label: "Resonance",
    moduleId: filterId,
    moduleType: ModuleType.Filter,
    propName: "Q",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.filter.type"),
    label: "Type",
    moduleId: filterId,
    moduleType: ModuleType.Filter,
    propName: "type",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.filter.amount"),
    label: "Amount",
    moduleId: filterId,
    moduleType: ModuleType.Filter,
    propName: "envelopeAmount",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.filter.attack"),
    label: "Attack",
    moduleId: filterEnvId,
    moduleType: ModuleType.Envelope,
    propName: "attack",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.filter.decay"),
    label: "Decay",
    moduleId: filterEnvId,
    moduleType: ModuleType.Envelope,
    propName: "decay",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.filter.sustain"),
    label: "Sustain",
    moduleId: filterEnvId,
    moduleType: ModuleType.Envelope,
    propName: "sustain",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.filter.release"),
    label: "Release",
    moduleId: filterEnvId,
    moduleType: ModuleType.Envelope,
    propName: "release",
  });

  addSessionBinding(
    context,
    namespacedTrackTarget(trackIndex, "track.mod.selectedLfo"),
    {
      kind: "number",
      label: "LFO Select",
      min: 1,
      max: 4,
      step: 1,
    },
    `track.${trackIndex}.mod.selectedLfo`,
  );
  addSessionBinding(
    context,
    namespacedTrackTarget(trackIndex, "track.mod.targetPreset"),
    {
      kind: "enum",
      label: "Targets",
      options: [
        "Off",
        "Pitch",
        "Filter",
        "Pitch + Filter",
        "Pan",
        "FX Mix",
        "Custom 1",
        "Custom 2",
      ],
    },
    `track.${trackIndex}.mod.targetPreset`,
  );
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.mod.waveform"),
    label: "Waveform",
    moduleId: lfoId,
    moduleType: ModuleType.LFO,
    propName: "waveform",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.mod.frequency"),
    label: "Freq",
    moduleId: lfoId,
    moduleType: ModuleType.LFO,
    propName: "frequency",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.mod.offset"),
    label: "Offset",
    moduleId: lfoId,
    moduleType: ModuleType.LFO,
    propName: "offset",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.mod.amount"),
    label: "Amount",
    moduleId: lfoId,
    moduleType: ModuleType.LFO,
    propName: "amount",
  });
  addModulePropBinding({
    context,
    bindingKey: namespacedTrackTarget(trackIndex, "track.mod.sync"),
    label: "Sync",
    moduleId: lfoId,
    moduleType: ModuleType.LFO,
    propName: "sync",
  });

  context.tracks.push({
    noteSourceModuleId,
    sourceProfileId: track.sourceProfileId,
    effectSlots: track.effectSlots,
  });
};

const compileControllerMidiLoop = (
  context: CompileContext,
  document: InstrumentDocument,
) => {
  const midiMapperProps = buildInstrumentMidiMapperProps(
    {
      document,
      bindings: context.bindings,
    },
    0,
    0,
  );

  pushModule(context, {
    id: INSTRUMENT_MIDI_IN_ID,
    name: "Instrument MIDI In",
    moduleType: ModuleType.MidiInput,
    props: {
      selectedName: INSTRUMENT_CONTROLLER_NAME,
      selectedId: undefined,
    },
  });

  pushModule(context, {
    id: INSTRUMENT_MIDI_MAPPER_ID,
    name: "Instrument MIDI Mapper",
    moduleType: ModuleType.MidiMapper,
    props: midiMapperProps as unknown as Record<string, unknown>,
  });

  pushModule(context, {
    id: INSTRUMENT_MIDI_OUT_ID,
    name: "Instrument MIDI Out",
    moduleType: ModuleType.MidiOutput,
    props: {
      selectedName: INSTRUMENT_CONTROLLER_NAME,
      selectedId: undefined,
    },
  });

  pushRoute(
    context,
    "instrument-route-midi-in-mapper",
    INSTRUMENT_MIDI_IN_ID,
    "midi out",
    INSTRUMENT_MIDI_MAPPER_ID,
    "midi in",
  );
  pushRoute(
    context,
    "instrument-route-mapper-midi-out",
    INSTRUMENT_MIDI_MAPPER_ID,
    "midi out",
    INSTRUMENT_MIDI_OUT_ID,
    "midi in",
  );
};

export const validateInstrumentDocument = (
  document: InstrumentDocument,
): string[] => {
  const errors: string[] = [];

  if (document.tracks.length !== PI_TRACK_COUNT) {
    errors.push(
      `Expected ${PI_TRACK_COUNT} tracks, received ${document.tracks.length}`,
    );
  }

  document.globalBlock.slots.forEach((slot, index) => {
    if (!slot.slotId) {
      errors.push(`Global slot ${index + 1} is missing slotId`);
    }
  });

  document.tracks.forEach((track, trackIndex) => {
    const voices = getTrackVoices(track);

    if (track.voices !== voices) {
      errors.push(
        `Track ${trackIndex + 1} voices must be between 1 and ${PI_STEP_NOTE_COUNT}`,
      );
    }

    if (track.effectSlots.length !== 4) {
      errors.push(`Track ${trackIndex + 1} must define exactly 4 effect slots`);
    }

    if (track.stepSequencer) {
      if (track.stepSequencer.pages.length !== 4) {
        errors.push(`Track ${trackIndex + 1} sequencer must define 4 pages`);
      }
      track.stepSequencer.pages.forEach((page, pageIndex) => {
        if (page.steps.length !== 16) {
          errors.push(
            `Track ${trackIndex + 1} page ${pageIndex + 1} must define 16 steps`,
          );
        }
        page.steps.forEach((step, stepIndex) => {
          if (step.notes.length !== voices) {
            errors.push(
              `Track ${trackIndex + 1} page ${pageIndex + 1} step ${stepIndex + 1} must define ${voices} notes`,
            );
          }
        });
      });
    }
  });

  return errors;
};

export const compileInstrumentDocument = (
  document: InstrumentDocument,
): InstrumentCompileResult => {
  const errors = validateInstrumentDocument(document);
  if (errors.length) {
    throw new Error(errors.join("\n"));
  }

  const context: CompileContext = {
    modules: [],
    routes: [],
    bindings: {},
    tracks: [],
  };

  compileGlobalBlock(context, document);

  document.tracks.forEach((track, trackIndex) => {
    compileTrack(context, track, trackIndex);
  });
  compileControllerMidiLoop(context, document);

  return {
    document: structuredClone(document),
    engine: {
      bpm: Number(document.globalBlock.slots[0]?.initialValue ?? 120),
      timeSignature: [4, 4],
      modules: context.modules,
      routes: context.routes,
    } as IEngineSerialize,
    bindings: context.bindings,
    tracks: context.tracks,
  };
};
