import { ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import Track from "@/tracks/Track";
import type { TrackPageKey } from "@/types";

describe("Track", () => {
  it("should create the expected default block inventory and block routes", () => {
    const track = new Track("track-1");
    const routes = Array.from(track.routes.values());

    expect(Array.from(track.blocks.keys())).toEqual([
      "source",
      "amp",
      "filter",
      "lfo1",
      "fx1",
      "fx2",
      "fx3",
      "fx4",
      "trackGain",
    ]);

    expect(routes).toHaveLength(7);
    for (const route of routes) {
      expect(typeof route.id).toBe("string");
    }

    expect(
      routes.map(({ source, destination }) => ({ source, destination })),
    ).toEqual(
      expect.arrayContaining([
        {
          source: { blockKey: "source", ioName: "out" },
          destination: { blockKey: "amp", ioName: "in" },
        },
        {
          source: { blockKey: "amp", ioName: "out" },
          destination: { blockKey: "filter", ioName: "in" },
        },
        {
          source: { blockKey: "filter", ioName: "out" },
          destination: { blockKey: "fx1", ioName: "in" },
        },
        {
          source: { blockKey: "fx1", ioName: "out" },
          destination: { blockKey: "fx2", ioName: "in" },
        },
        {
          source: { blockKey: "fx2", ioName: "out" },
          destination: { blockKey: "fx3", ioName: "in" },
        },
        {
          source: { blockKey: "fx3", ioName: "out" },
          destination: { blockKey: "fx4", ioName: "in" },
        },
        {
          source: { blockKey: "fx4", ioName: "out" },
          destination: { blockKey: "trackGain", ioName: "in" },
        },
      ]),
    );
  });

  it("should expose the three controller pages with fixed two-region eight-slot layout", () => {
    const track = new Track("track-1");

    expect(Array.from(track.pages.keys())).toEqual([
      "sourceAmp",
      "filterMod",
      "fx",
    ]);

    const pageKeys: TrackPageKey[] = ["sourceAmp", "filterMod", "fx"];
    for (const pageKey of pageKeys) {
      const page = track.findPage(pageKey);

      expect(page.kind).toBe("split");
      expect(page.regions).toHaveLength(2);
      expect(page.regions[0].position).toBe("top");
      expect(page.regions[1].position).toBe("bottom");
      expect(page.regions[0].slots).toHaveLength(8);
      expect(page.regions[1].slots).toHaveLength(8);
    }
  });

  it("should resolve every non-empty page slot ref to a real block slot", () => {
    const track = new Track("track-1");

    for (const page of track.pages.values()) {
      for (const region of page.regions) {
        for (const slotRef of region.slots) {
          if (slotRef.kind === "empty") {
            continue;
          }

          const block = track.findBlock(slotRef.blockKey);
          const slot = block.findSlot(slotRef.slotKey);

          expect(slot.key).toBe(slotRef.slotKey);
        }
      }
    }
  });

  it("should serialize stable engine-oriented module ids", () => {
    const track = new Track("track-1");
    const serialized = track.serialize();

    const moduleIds = serialized.blocks
      .flatMap((block) => block.modules.map((module) => module.id))
      .sort();

    expect(moduleIds).toEqual([
      "amp.envelope",
      "amp.gain",
      "filter.constant",
      "filter.envelope",
      "filter.main",
      "fx1.main",
      "fx2.main",
      "fx3.main",
      "fx4.main",
      "lfo1.main",
      "source.main",
      "trackGain.main",
    ]);
  });

  it("should expose the first lfo block on the modulation region", () => {
    const track = new Track("track-1");
    const filterModPage = track.findPage("filterMod");

    expect(filterModPage.regions[1].slots).toEqual([
      { kind: "slot", blockKey: "lfo1", slotKey: "waveform" },
      { kind: "slot", blockKey: "lfo1", slotKey: "frequency" },
      { kind: "slot", blockKey: "lfo1", slotKey: "division" },
      { kind: "slot", blockKey: "lfo1", slotKey: "offset" },
      { kind: "slot", blockKey: "lfo1", slotKey: "amount" },
      { kind: "slot", blockKey: "lfo1", slotKey: "sync" },
      { kind: "slot", blockKey: "lfo1", slotKey: "phase" },
      { kind: "empty" },
    ]);
  });

  it("starts the amp envelope and fx chain with safe dry defaults", () => {
    const track = new Track("track-1");
    const serialized = track.serialize();

    const ampEnvelope = serialized.blocks
      .flatMap((block) => block.modules)
      .find((module) => module.id === "amp.envelope");
    const fxModules = Object.fromEntries(
      serialized.blocks
        .flatMap((block) => block.modules)
        .filter((module) =>
          ["fx1.main", "fx2.main", "fx3.main", "fx4.main"].includes(module.id),
        )
        .map((module) => [module.id, module]),
    );

    expect(ampEnvelope?.props).toMatchObject({
      attack: 0.01,
      decay: 0,
      sustain: 1,
      release: 0.05,
    });

    expect(fxModules["fx1.main"]?.props).toMatchObject({ mix: 0 });
    expect(fxModules["fx2.main"]?.props).toMatchObject({ mix: 0 });
    expect(fxModules["fx3.main"]?.props).toMatchObject({ mix: 0 });
    expect(fxModules["fx4.main"]?.props).toMatchObject({ mix: 0 });
  });

  it("maps the drum machine source profile into the normal track flow", () => {
    const track = new Track("track-1", {
      sourceProfileId: "drumMachine",
    });
    const serialized = track.serialize();
    const sourceModule = serialized.blocks
      .flatMap((block) => block.modules)
      .find((module) => module.id === "source.main");
    const sourceAmpPage = track.findPage("sourceAmp");

    expect(sourceModule?.moduleType).toBe(ModuleType.DrumMachine);
    expect(sourceAmpPage.regions[0].slots).toEqual([
      { kind: "slot", blockKey: "source", slotKey: "kickLevel" },
      { kind: "slot", blockKey: "source", slotKey: "snareLevel" },
      { kind: "slot", blockKey: "source", slotKey: "clapLevel" },
      { kind: "slot", blockKey: "source", slotKey: "closedHatLevel" },
      { kind: "slot", blockKey: "source", slotKey: "tomLevel" },
      { kind: "slot", blockKey: "source", slotKey: "openHatLevel" },
      { kind: "slot", blockKey: "source", slotKey: "cymbalLevel" },
      { kind: "slot", blockKey: "source", slotKey: "cowbellLevel" },
    ]);
  });
});
