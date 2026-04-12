import AmpBlock from "@/blocks/AmpBlock";
import FilterBlock from "@/blocks/FilterBlock";
import LfoBlock from "@/blocks/LfoBlock";
import TrackGainBlock from "@/blocks/TrackGainBlock";
import ChorusBlock from "@/blocks/effects/ChorusBlock";
import DelayBlock from "@/blocks/effects/DelayBlock";
import DistortionBlock from "@/blocks/effects/DistortionBlock";
import ReverbBlock from "@/blocks/effects/ReverbBlock";
import DrumMachineBlock from "@/blocks/source/DrumMachineBlock";
import NoiseBlock from "@/blocks/source/NoiseBlock";
import OscBlock from "@/blocks/source/OscBlock";
import ThreeOscBlock from "@/blocks/source/ThreeOscBlock";
import UnassignedSourceBlock from "@/blocks/source/UnassignedSourceBlock";
import WavetableBlock from "@/blocks/source/WavetableBlock";
import type { EffectProfileId, SourceProfileId } from "@/document/types";
import {
  createPage,
  createSlotRef,
  EMPTY_SLOT_REF,
  type PageSlotRef,
} from "@/pages/Page";
import type { Fixed8 } from "@/types";
import BaseTrack from "./BaseTrack";
import type { BaseTrackOptions, TrackPlug } from "./types";

function slot(blockKey: Parameters<typeof createSlotRef>[0], slotKey: string) {
  return createSlotRef(blockKey, slotKey);
}

export type TrackOptions = Partial<BaseTrackOptions> & {
  sourceProfileId?: SourceProfileId;
  fxChain?: [
    EffectProfileId,
    EffectProfileId,
    EffectProfileId,
    EffectProfileId,
  ];
};

const DEFAULT_FX_CHAIN: NonNullable<TrackOptions["fxChain"]> = [
  "distortion",
  "chorus",
  "delay",
  "reverb",
];

function createSlots(
  blockKey: Parameters<typeof createSlotRef>[0],
  slotKeys: string[],
): Fixed8<PageSlotRef> {
  const slots: PageSlotRef[] = slotKeys.map((slotKey) =>
    slot(blockKey, slotKey),
  );
  while (slots.length < 8) {
    slots.push(EMPTY_SLOT_REF);
  }

  return slots as Fixed8<PageSlotRef>;
}

function createSourceBlock(sourceProfileId: SourceProfileId, voices: number) {
  switch (sourceProfileId) {
    case "unassigned":
      return new UnassignedSourceBlock();
    case "osc":
      return new OscBlock(voices);
    case "wavetable":
      return new WavetableBlock(voices);
    case "noise":
      return new NoiseBlock();
    case "threeOsc":
      return new ThreeOscBlock(voices);
    case "drumMachine":
      return new DrumMachineBlock();
  }
}

function createSourcePageSlots(
  sourceProfileId: SourceProfileId,
): Fixed8<PageSlotRef> {
  switch (sourceProfileId) {
    case "unassigned":
      return createSlots("source", []);
    case "osc":
      return createSlots("source", [
        "wave",
        "frequency",
        "octave",
        "coarse",
        "fine",
        "lowGain",
      ]);
    case "wavetable":
      return createSlots("source", [
        "position",
        "frequency",
        "octave",
        "coarse",
        "fine",
        "lowGain",
      ]);
    case "noise":
      return createSlots("source", ["type"]);
    case "threeOsc":
      return createSlots("source", [
        "wave1",
        "coarse1",
        "wave2",
        "coarse2",
        "wave3",
        "coarse3",
        "gain",
      ]);
    case "drumMachine":
      return createSlots("source", [
        "kickLevel",
        "snareLevel",
        "clapLevel",
        "closedHatLevel",
        "tomLevel",
        "openHatLevel",
        "cymbalLevel",
        "cowbellLevel",
      ]);
  }
}

function createTrackAudioOutputPlugs(): TrackPlug[] {
  return [{ blockKey: "trackGain", ioName: "out" }];
}

function createEffectBlock(
  key: "fx1" | "fx2" | "fx3" | "fx4",
  effectProfileId: EffectProfileId,
) {
  switch (effectProfileId) {
    case "distortion":
      return new DistortionBlock(key);
    case "chorus":
      return new ChorusBlock(key);
    case "delay":
      return new DelayBlock(key);
    case "reverb":
      return new ReverbBlock(key);
  }
}

function createEffectPageSlots(
  blockKey: "fx1" | "fx2" | "fx3" | "fx4",
  effectProfileId: EffectProfileId,
): PageSlotRef[] {
  switch (effectProfileId) {
    case "distortion":
      return [
        slot(blockKey, "drive"),
        slot(blockKey, "tone"),
        slot(blockKey, "mix"),
        EMPTY_SLOT_REF,
      ];
    case "chorus":
      return [
        slot(blockKey, "rate"),
        slot(blockKey, "depth"),
        slot(blockKey, "feedback"),
        slot(blockKey, "mix"),
      ];
    case "delay":
      return [
        slot(blockKey, "time"),
        slot(blockKey, "feedback"),
        slot(blockKey, "mix"),
        slot(blockKey, "sync"),
      ];
    case "reverb":
      return [
        slot(blockKey, "type"),
        slot(blockKey, "decayTime"),
        slot(blockKey, "preDelay"),
        slot(blockKey, "mix"),
      ];
  }
}

export default class Track extends BaseTrack {
  constructor(key = "track", options: TrackOptions = {}) {
    const voices = options.voices ?? 8;

    super(key, {
      voices,
      midiChannel: options.midiChannel ?? 1,
    });
    const sourceProfileId = options.sourceProfileId ?? "osc";
    const fxChain: NonNullable<TrackOptions["fxChain"]> = options.fxChain ?? [
      ...DEFAULT_FX_CHAIN,
    ];

    const source = this.addBlock(createSourceBlock(sourceProfileId, voices));
    const amp = this.addBlock(new AmpBlock(voices));
    const filter = this.addBlock(new FilterBlock(voices));
    this.addBlock(new LfoBlock(voices));
    this.addBlock(createEffectBlock("fx1", fxChain[0]));
    this.addBlock(createEffectBlock("fx2", fxChain[1]));
    this.addBlock(createEffectBlock("fx3", fxChain[2]));
    this.addBlock(createEffectBlock("fx4", fxChain[3]));
    this.addBlock(new TrackGainBlock());

    this.addInput({
      ioName: "midi in",
      kind: "midi",
      plugs: [
        { blockKey: source.key, ioName: "midi in" },
        { blockKey: amp.key, ioName: "midi in" },
        { blockKey: filter.key, ioName: "midi in" },
      ],
    });

    this.addOutput({
      ioName: "audio out",
      kind: "audio",
      plugs: createTrackAudioOutputPlugs(),
    });

    this.addRoute({
      source: { blockKey: "source", ioName: "out" },
      destination: { blockKey: "amp", ioName: "in" },
    });

    this.addRoute({
      source: { blockKey: "amp", ioName: "out" },
      destination: { blockKey: "filter", ioName: "in" },
    });

    this.addRoute({
      source: { blockKey: "filter", ioName: "out" },
      destination: { blockKey: "fx1", ioName: "in" },
    });

    this.addRoute({
      source: { blockKey: "fx1", ioName: "out" },
      destination: { blockKey: "fx2", ioName: "in" },
    });

    this.addRoute({
      source: { blockKey: "fx2", ioName: "out" },
      destination: { blockKey: "fx3", ioName: "in" },
    });

    this.addRoute({
      source: { blockKey: "fx3", ioName: "out" },
      destination: { blockKey: "fx4", ioName: "in" },
    });

    this.addRoute({
      source: { blockKey: "fx4", ioName: "out" },
      destination: { blockKey: "trackGain", ioName: "in" },
    });

    const sourceAmpTop = createSourcePageSlots(sourceProfileId);

    const sourceAmpBottom = [
      slot("amp", "attack"),
      slot("amp", "decay"),
      slot("amp", "sustain"),
      slot("amp", "release"),
      EMPTY_SLOT_REF,
      EMPTY_SLOT_REF,
      EMPTY_SLOT_REF,
      slot("amp", "gain"),
    ] as Fixed8<PageSlotRef>;

    const filterModTop = [
      slot("filter", "cutoff"),
      slot("filter", "Q"),
      slot("filter", "type"),
      slot("filter", "envelopeAmount"),
      slot("filter", "attack"),
      slot("filter", "decay"),
      slot("filter", "sustain"),
      slot("filter", "release"),
    ] as Fixed8<PageSlotRef>;

    const filterModBottom = [
      slot("lfo1", "waveform"),
      slot("lfo1", "frequency"),
      slot("lfo1", "division"),
      slot("lfo1", "offset"),
      slot("lfo1", "amount"),
      slot("lfo1", "sync"),
      slot("lfo1", "phase"),
      EMPTY_SLOT_REF,
    ] as Fixed8<PageSlotRef>;

    const fxTop = [
      ...createEffectPageSlots("fx1", fxChain[0]),
      ...createEffectPageSlots("fx2", fxChain[1]),
    ] as Fixed8<PageSlotRef>;

    const fxBottom = [
      ...createEffectPageSlots("fx3", fxChain[2]),
      ...createEffectPageSlots("fx4", fxChain[3]),
    ] as Fixed8<PageSlotRef>;

    this.setPage(createPage("sourceAmp", sourceAmpTop, sourceAmpBottom));
    this.setPage(createPage("filterMod", filterModTop, filterModBottom));
    this.setPage(createPage("fx", fxTop, fxBottom));
  }
}
