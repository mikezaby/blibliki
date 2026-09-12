// @vitest-environment node
import { MidiEvent } from "@blibliki/engine";
import { type IRoute, VideoModuleType } from "@blibliki/video-engine";
import { describe, expect, it, vi } from "vitest";
import {
  bridgedMidiRoutes,
  MidiBridge,
  noteEvent,
} from "../../src/video/midiBridge";

type Listener = (event: MidiEvent) => void;

function fakeEngine(moduleIds: string[]) {
  const listeners = new Map<string, Set<Listener>>(
    moduleIds.map((id) => [id, new Set<Listener>()]),
  );
  const engine = {
    findModule: (id: string) => {
      const set = listeners.get(id);
      if (!set) throw new Error("not found");
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
  const send = (id: string, event: MidiEvent) => {
    for (const listener of listeners.get(id) ?? []) listener(event);
  };
  const listening = (id: string) => listeners.get(id)?.size ?? 0;

  return { engine: engine as never, send, listening };
}

const route = (id: string, from: string, to = "env"): IRoute => ({
  id,
  kind: "midi",
  source: { moduleId: from, ioName: "midi out" },
  destination: { moduleId: to, ioName: "in" },
});

describe("bridgedMidiRoutes", () => {
  it("keeps the MIDI routes that start outside the video patch", () => {
    const modules = [
      {
        id: "env",
        name: "env",
        moduleType: VideoModuleType.Envelope,
        props: {},
      },
      { id: "src", name: "src", moduleType: VideoModuleType.Source, props: {} },
    ];
    const routes: IRoute[] = [
      route("a", "sched"),
      route("b", "src"),
      {
        id: "c",
        kind: "texture",
        source: { moduleId: "src", ioName: "out" },
        destination: { moduleId: "env", ioName: "in" },
      },
    ];

    expect(bridgedMidiRoutes(routes, modules).map((r) => r.id)).toEqual(["a"]);
  });
});

describe("noteEvent", () => {
  it("turns a note on into its MIDI number (C3 is 60 here), a 0..1 velocity and the voice as instance", () => {
    const tagged = MidiEvent.fromNote("C3", true, 0);
    tagged.voiceNo = 3;

    expect(noteEvent(tagged)).toEqual({
      type: "noteOn",
      note: 60,
      velocity: 1,
      instance: 3,
    });
    expect(noteEvent(MidiEvent.fromNote("C3", false, 0))).toMatchObject({
      type: "noteOff",
      note: 60,
    });
    expect(noteEvent(MidiEvent.fromNote("C3", true, 0))).not.toHaveProperty(
      "instance",
    );
  });

  it("drops anything that is not a note", () => {
    expect(noteEvent(MidiEvent.fromCC(1, 64, 0))).toBeNull();
  });
});

describe("MidiBridge", () => {
  it("listens on the route's audio MIDI output and forwards to the route's destination", () => {
    const { engine, send } = fakeEngine(["sched"]);
    const forward = vi.fn();
    const bridge = new MidiBridge(engine, forward);

    bridge.sync([route("r1", "sched", "notes")]);
    const event = MidiEvent.fromNote("A3", true, 0);
    event.voiceNo = 1;
    send("sched", event);

    expect(forward).toHaveBeenCalledWith("notes", "in", {
      type: "noteOn",
      note: 69,
      velocity: 1,
      instance: 1,
    });
  });

  it("drops a listener when its route goes, and all on dispose", () => {
    const { engine, listening } = fakeEngine(["keys", "seq"]);
    const bridge = new MidiBridge(engine, vi.fn());

    bridge.sync([route("r1", "keys"), route("r2", "seq")]);
    bridge.sync([route("r2", "seq")]);

    expect(listening("keys")).toBe(0);
    expect(listening("seq")).toBe(1);

    bridge.dispose();

    expect(listening("seq")).toBe(0);
  });

  it("waits for a source that is not in the engine yet", () => {
    const { engine, listening } = fakeEngine([]);
    const bridge = new MidiBridge(engine, vi.fn());

    expect(() => {
      bridge.sync([route("r1", "later")]);
    }).not.toThrow();
    expect(listening("later")).toBe(0);
  });
});
