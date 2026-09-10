// @vitest-environment node
import { MidiEvent } from "@blibliki/engine";
import { VideoModuleType } from "@blibliki/video-engine";
import { describe, expect, it, vi } from "vitest";
import {
  MidiTaps,
  noteEvent,
  referencedMidiModules,
} from "../../src/video/midiTaps";

type Listener = (event: MidiEvent) => void;

function fakeEngine() {
  const listeners = new Map<string, Set<Listener>>();
  const engine = {
    findModule: (id: string) => {
      if (id !== "kb" && id !== "seq") throw new Error("not found");
      const set = listeners.get(id) ?? new Set<Listener>();
      listeners.set(id, set);
      return {
        outputs: {
          collection: [
            { name: "out", isMidi: () => false },
            {
              name: "midi out",
              isMidi: () => true,
              listen: (listener: Listener) => {
                set.add(listener);
                return () => set.delete(listener);
              },
            },
          ],
        },
      };
    },
  };

  return { engine, listeners };
}

const module = (id: string, moduleId: string) => ({
  id,
  name: id,
  moduleType: VideoModuleType.MidiNotes,
  props: { moduleId, instances: 2 },
});

describe("referencedMidiModules", () => {
  it("collects the audio modules MIDI Notes name, once each", () => {
    const ids = referencedMidiModules([
      module("a", "kb"),
      module("b", "kb"),
      module("c", ""),
      {
        id: "d",
        name: "d",
        moduleType: VideoModuleType.Band,
        props: { moduleId: "osc" },
      },
    ]);

    expect([...ids]).toEqual(["kb"]);
  });
});

describe("noteEvent", () => {
  it("turns a note on into its MIDI number (C3 is 60 here) and a 0..1 velocity", () => {
    expect(noteEvent(MidiEvent.fromNote("C3", true, 0))).toEqual({
      type: "noteOn",
      note: 60,
      velocity: 1,
    });
    expect(noteEvent(MidiEvent.fromNote("C3", false, 0))).toMatchObject({
      type: "noteOff",
      note: 60,
    });
  });

  it("drops anything that is not a note", () => {
    expect(noteEvent(MidiEvent.fromCC(1, 64, 0))).toBeNull();
  });
});

describe("MidiTaps", () => {
  it("listens on the named module's MIDI output and forwards its notes", () => {
    const { engine, listeners } = fakeEngine();
    const forward = vi.fn();
    const taps = new MidiTaps(engine, forward);

    taps.sync(new Set(["kb"]));
    for (const listener of listeners.get("kb") ?? []) {
      listener(MidiEvent.fromNote("A3", true, 0));
    }

    expect(forward).toHaveBeenCalledWith("kb", {
      type: "noteOn",
      note: 69,
      velocity: 1,
    });
  });

  it("stops listening when no MIDI Notes names the module any more", () => {
    const { engine, listeners } = fakeEngine();
    const taps = new MidiTaps(engine, vi.fn());

    taps.sync(new Set(["kb", "seq"]));
    taps.sync(new Set(["seq"]));

    expect(listeners.get("kb")?.size).toBe(0);
    expect(listeners.get("seq")?.size).toBe(1);

    taps.dispose();

    expect(listeners.get("seq")?.size).toBe(0);
  });

  it("skips a module that is missing or has no MIDI output", () => {
    const { engine } = fakeEngine();
    const taps = new MidiTaps(engine, vi.fn());

    expect(() => {
      taps.sync(new Set(["gone"]));
    }).not.toThrow();
  });
});
