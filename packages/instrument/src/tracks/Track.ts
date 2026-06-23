import AmpBlock from "@/blocks/AmpBlock";
import FilterBlock from "@/blocks/FilterBlock";
import LfoBlock from "@/blocks/LfoBlock";
import TrackGainBlock from "@/blocks/TrackGainBlock";
import type { SourceProfileId } from "@/document/types";
import { createPage, EMPTY_SLOT_REF, type PageSlotRef } from "@/pages/Page";
import type { Fixed8 } from "@/types";
import BaseTrack from "./BaseTrack";
import {
  createEffectBlock,
  createEffectPageSlots,
  DEFAULT_FX_CHAIN,
  type TrackFxChain,
} from "./TrackEffectProfile";
import { createTrackSlot } from "./TrackPageSlots";
import { createSourceBlock, createSourcePageSlots } from "./TrackSourceProfile";
import type { BaseTrackOptions, TrackPlug } from "./types";

export type TrackOptions = Partial<BaseTrackOptions> & {
  audioSourceType?: "internal" | "track";
  sourceProfileId?: SourceProfileId;
  fxChain?: TrackFxChain;
};

function createTrackAudioOutputPlugs(): TrackPlug[] {
  return [{ blockKey: "trackGain", ioName: "out" }];
}

export default class Track extends BaseTrack {
  constructor(key = "track", options: TrackOptions = {}) {
    const voices = options.voices ?? 8;

    super(key, {
      voices,
      midiChannel: options.midiChannel ?? 1,
    });
    const audioSourceType = options.audioSourceType ?? "internal";
    const processingVoices = audioSourceType === "track" ? 1 : voices;
    const sourceProfileId = options.sourceProfileId ?? "osc";
    const fxChain: NonNullable<TrackOptions["fxChain"]> = options.fxChain ?? [
      ...DEFAULT_FX_CHAIN,
    ];

    const source =
      audioSourceType === "internal"
        ? this.addBlock(createSourceBlock(sourceProfileId, voices))
        : undefined;
    const amp =
      audioSourceType === "internal"
        ? this.addBlock(new AmpBlock(voices))
        : undefined;
    const filter = this.addBlock(new FilterBlock(processingVoices));
    this.addBlock(new LfoBlock(processingVoices));
    this.addBlock(createEffectBlock("fx1", fxChain[0]));
    this.addBlock(createEffectBlock("fx2", fxChain[1]));
    this.addBlock(createEffectBlock("fx3", fxChain[2]));
    this.addBlock(createEffectBlock("fx4", fxChain[3]));
    this.addBlock(new TrackGainBlock());

    if (audioSourceType === "internal") {
      if (!source || !amp) {
        throw new Error("Internal track requires source and amp blocks");
      }

      this.addInput({
        ioName: "midi in",
        kind: "midi",
        plugs: [
          { blockKey: source.key, ioName: "midi in" },
          { blockKey: amp.key, ioName: "midi in" },
          { blockKey: filter.key, ioName: "midi in" },
        ],
      });

      this.addRoute({
        source: { blockKey: "source", ioName: "out" },
        destination: { blockKey: "amp", ioName: "in" },
      });

      this.addRoute({
        source: { blockKey: "amp", ioName: "out" },
        destination: { blockKey: "filter", ioName: "in" },
      });
    } else {
      this.addInput({
        ioName: "audio in",
        kind: "audio",
        plugs: [{ blockKey: filter.key, ioName: "in" }],
      });
    }

    this.addOutput({
      ioName: "audio send",
      kind: "audio",
      plugs: [{ blockKey: "fx4", ioName: "out" }],
    });

    this.addOutput({
      ioName: "audio out",
      kind: "audio",
      plugs: createTrackAudioOutputPlugs(),
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

    const filterModTop = [
      createTrackSlot("filter", "cutoff"),
      createTrackSlot("filter", "Q"),
      createTrackSlot("filter", "type"),
      createTrackSlot("filter", "envelopeAmount"),
      createTrackSlot("filter", "attack"),
      createTrackSlot("filter", "decay"),
      createTrackSlot("filter", "sustain"),
      createTrackSlot("filter", "release"),
    ] as Fixed8<PageSlotRef>;

    const filterModBottom = [
      createTrackSlot("lfo1", "waveform"),
      createTrackSlot("lfo1", "frequency"),
      createTrackSlot("lfo1", "division"),
      createTrackSlot("lfo1", "offset"),
      createTrackSlot("lfo1", "amount"),
      createTrackSlot("lfo1", "sync"),
      createTrackSlot("lfo1", "phase"),
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

    if (audioSourceType === "internal") {
      const sourceAmpTop = createSourcePageSlots(sourceProfileId);
      const sourceAmpBottom = [
        createTrackSlot("amp", "attack"),
        createTrackSlot("amp", "decay"),
        createTrackSlot("amp", "sustain"),
        createTrackSlot("amp", "release"),
        EMPTY_SLOT_REF,
        EMPTY_SLOT_REF,
        EMPTY_SLOT_REF,
        createTrackSlot("amp", "gain"),
      ] as Fixed8<PageSlotRef>;

      this.setPage(createPage("sourceAmp", sourceAmpTop, sourceAmpBottom));
    }

    this.setPage(createPage("filterMod", filterModTop, filterModBottom));
    this.setPage(createPage("fx", fxTop, fxBottom));
  }
}
