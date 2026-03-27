import { describe, expect, it } from "vitest";
import AmpBlock from "@/blocks/AmpBlock";
import TrackGainBlock from "@/blocks/TrackGainBlock";
import { createPage, EMPTY_SLOT_REF } from "@/pages/Page";
import BaseTrack from "@/tracks/BaseTrack";
import Track from "@/tracks/Track";
import type { Fixed8 } from "@/types";

const EMPTY_SLOTS = [
  EMPTY_SLOT_REF,
  EMPTY_SLOT_REF,
  EMPTY_SLOT_REF,
  EMPTY_SLOT_REF,
  EMPTY_SLOT_REF,
  EMPTY_SLOT_REF,
  EMPTY_SLOT_REF,
  EMPTY_SLOT_REF,
] as Fixed8<typeof EMPTY_SLOT_REF>;

class AmpEnvelopeMidiTrack extends BaseTrack {
  constructor() {
    super("amp-envelope-midi-track", { voices: 1, midiChannel: 1 });

    this.addBlock(new AmpBlock());
    this.addBlock(new TrackGainBlock());

    this.addInput({
      ioName: "midi in",
      kind: "midi",
      plugs: [{ blockKey: "amp", ioName: "midi in" }],
    });

    this.addOutput({
      ioName: "audio out",
      kind: "audio",
      plugs: [{ blockKey: "trackGain", ioName: "out" }],
    });

    this.addRoute({
      source: { blockKey: "amp", ioName: "out" },
      destination: { blockKey: "trackGain", ioName: "in" },
    });

    this.setPage(createPage("sourceAmp", EMPTY_SLOTS, EMPTY_SLOTS));
  }
}

describe("Track IO", () => {
  it("stores voices and midiChannel from track options", () => {
    const track = new Track("track-1", {
      voices: 4,
      midiChannel: 3,
    });

    expect(track.voices).toBe(4);
    expect(track.midiChannel).toBe(3);
  });

  it("serializes explicit track midi in and audio out ports", () => {
    const serialized = trackSerializeWithIO(new Track("track-1"));

    expect(serialized.inputs).toEqual([
      {
        ioName: "midi in",
        kind: "midi",
        plugs: [
          { blockKey: "source", ioName: "midi in" },
          { blockKey: "amp", ioName: "midi in" },
          { blockKey: "filter", ioName: "midi in" },
        ],
      },
    ]);

    expect(serialized.outputs).toEqual([
      {
        ioName: "audio out",
        kind: "audio",
        plugs: [{ blockKey: "trackGain", ioName: "out" }],
      },
    ]);
  });

  it("keeps the unassigned source in the authored track midi fanout contract", () => {
    const serialized = trackSerializeWithIO(
      new Track("track-1", { sourceProfileId: "unassigned" }),
    );

    expect(serialized.inputs).toEqual([
      {
        ioName: "midi in",
        kind: "midi",
        plugs: [
          { blockKey: "source", ioName: "midi in" },
          { blockKey: "amp", ioName: "midi in" },
          { blockKey: "filter", ioName: "midi in" },
        ],
      },
    ]);
  });

  it("lets a track explicitly route midi in to the amp envelope block input", () => {
    const serialized = trackSerializeWithIO(new AmpEnvelopeMidiTrack());

    expect(serialized.inputs).toEqual([
      {
        ioName: "midi in",
        kind: "midi",
        plugs: [{ blockKey: "amp", ioName: "midi in" }],
      },
    ]);
  });

  it("encapsulates external midi filtering behind BaseTrack runtime helpers", () => {
    const track = new Track("track-1");
    const runtime = track.createExternalMidiRuntime({
      moduleId: "track-1.runtime.noteInput",
      ioName: "midi out",
    });

    expect(runtime.modules).toEqual([
      expect.objectContaining({
        id: "track-1.runtime.midiChannelFilter",
      }),
      expect.objectContaining({
        id: "track-1.runtime.voiceScheduler",
        voices: 8,
      }),
    ]);
    expect(
      runtime.routes.map(({ source, destination }) => ({
        source,
        destination,
      })),
    ).toEqual([
      {
        source: { moduleId: "track-1.runtime.noteInput", ioName: "midi out" },
        destination: {
          moduleId: "track-1.runtime.midiChannelFilter",
          ioName: "midi in",
        },
      },
      {
        source: {
          moduleId: "track-1.runtime.midiChannelFilter",
          ioName: "midi out",
        },
        destination: {
          moduleId: "track-1.runtime.voiceScheduler",
          ioName: "midi in",
        },
      },
      {
        source: {
          moduleId: "track-1.runtime.voiceScheduler",
          ioName: "midi out",
        },
        destination: { moduleId: "source.main", ioName: "midi in" },
      },
      {
        source: {
          moduleId: "track-1.runtime.voiceScheduler",
          ioName: "midi out",
        },
        destination: { moduleId: "amp.envelope", ioName: "midi in" },
      },
      {
        source: {
          moduleId: "track-1.runtime.voiceScheduler",
          ioName: "midi out",
        },
        destination: { moduleId: "filter.main", ioName: "midi in" },
      },
      {
        source: {
          moduleId: "track-1.runtime.voiceScheduler",
          ioName: "midi out",
        },
        destination: { moduleId: "filter.envelope", ioName: "midi in" },
      },
    ]);
  });
});

function trackSerializeWithIO(track: BaseTrack) {
  return track.serialize() as ReturnType<BaseTrack["serialize"]> & {
    inputs: {
      ioName: string;
      kind: string;
      plugs: { blockKey: string; ioName: string }[];
    }[];
    outputs: {
      ioName: string;
      kind: string;
      plugs: { blockKey: string; ioName: string }[];
    }[];
  };
}
