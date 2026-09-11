import { describe, expect, it } from "vitest";
import { VideoEngine } from "@/VideoEngine";
import { IRoute } from "@/core/Routes";
import { VideoModuleType } from "@/modules";

function chain() {
  const engine = new VideoEngine();
  const src = engine.addModule({
    id: "src",
    name: "src",
    moduleType: VideoModuleType.Source,
  });
  const fx = engine.addModule({
    id: "fx",
    name: "fx",
    moduleType: VideoModuleType.HueRotate,
  });
  const out = engine.addModule({
    id: "out",
    name: "out",
    moduleType: VideoModuleType.Output,
  });
  engine.addRoute({
    source: { moduleId: src.id, ioName: "out" },
    destination: { moduleId: fx.id, ioName: "in" },
  });
  engine.addRoute({
    source: { moduleId: fx.id, ioName: "out" },
    destination: { moduleId: out.id, ioName: "in" },
  });

  return engine;
}

function withAudioProp(engine: VideoEngine) {
  engine.addModule({
    id: "ap",
    name: "ap",
    moduleType: VideoModuleType.AudioProp,
    props: { moduleId: "osc", prop: "frequency" },
  });
  engine.addRoute({
    kind: "control",
    source: { moduleId: "ap", ioName: "out" },
    destination: { moduleId: "fx", ioName: "amount" },
    inMin: 0,
    inMax: 1000,
    outMin: 0,
    outMax: 360,
  });

  return engine;
}

const control: Omit<IRoute, "id"> = {
  kind: "control",
  source: { moduleId: "ap", ioName: "out" },
  destination: { moduleId: "fx", ioName: "amount" },
  inMin: 0,
  inMax: 1,
  outMin: 0,
  outMax: 360,
};

describe("VideoEngine", () => {
  it("builds passes for the chain", () => {
    expect(
      chain()
        .passes()
        .map((p) => p.moduleId),
    ).toEqual(["src", "fx", "out"]);
  });

  it("does not build a pass for a control module", () => {
    const engine = withAudioProp(chain());

    expect(engine.passes().map((p) => p.moduleId)).toEqual([
      "src",
      "fx",
      "out",
    ]);
  });

  it("applies a control route after a tick", () => {
    const engine = withAudioProp(chain());
    engine.setControls({ "patch:osc:frequency": 250 });
    engine.tick({ now: 0, dt: 0 });

    expect(engine.passes()[1]?.uniforms.amount).toBe(90);
    expect(engine.findModule("fx").props).toEqual({ amount: 0, instances: 1 });
  });

  it("clamps the sum of several control routes to the prop's schema range", () => {
    const engine = withAudioProp(chain());
    engine.addRoute({ ...control, inMax: 1000, outMax: 360 });
    engine.setControls({ "patch:osc:frequency": 1000 });
    engine.tick({ now: 0, dt: 0 });

    expect(engine.passes()[1]?.uniforms.amount).toBe(360);
  });

  it("resolves control routes into a control module's props before ticking it", () => {
    const engine = chain();
    engine.addModule({
      id: "ap",
      name: "ap",
      moduleType: VideoModuleType.AudioProp,
      props: { moduleId: "osc", prop: "frequency" },
    });
    engine.addModule({
      id: "lfo",
      name: "lfo",
      moduleType: VideoModuleType.LFO,
      props: { frequency: 1 },
    });
    engine.addRoute({
      kind: "control",
      source: { moduleId: "ap", ioName: "out" },
      destination: { moduleId: "lfo", ioName: "frequency" },
      inMin: 0,
      inMax: 4,
      outMin: 0,
      outMax: 4,
    });
    engine.addRoute({
      kind: "control",
      source: { moduleId: "lfo", ioName: "out" },
      destination: { moduleId: "fx", ioName: "amount" },
      inMin: 0,
      inMax: 1,
      outMin: 0,
      outMax: 360,
    });
    engine.setControls({ "patch:osc:frequency": 2 });
    engine.tick({ now: 0.125, dt: 0.125 });

    expect(engine.passes()[1]?.uniforms.amount).toBeCloseTo(360);
    expect(engine.findModule("lfo").props).toMatchObject({ frequency: 1 });
  });

  it("ticks an instanced control module once per instance and renders its consumers per instance", () => {
    const engine = chain();
    engine.addModule({
      id: "env",
      name: "env",
      moduleType: VideoModuleType.Envelope,
      props: { instances: 2, gate: 1, attack: 0, decay: 0, sustain: 0.5 },
    });
    engine.updateProps("fx", { instances: 2 });
    engine.addRoute({
      kind: "control",
      source: { moduleId: "env", ioName: "out" },
      destination: { moduleId: "fx", ioName: "amount" },
      inMin: 0,
      inMax: 1,
      outMin: 0,
      outMax: 360,
    });
    engine.tick({ now: 0, dt: 0.1 });
    engine.tick({ now: 0.1, dt: 0.1 });

    const passes = engine.passes();

    expect(
      passes
        .filter((p) => p.moduleId === "fx" && !p.compose)
        .map((p) => [p.instance, p.uniforms.amount]),
    ).toEqual([
      [0, 180],
      [1, 180],
    ]);
    expect(passes.at(-2)?.compose).toEqual({ instances: 2, layout: "grid" });
    expect(passes.at(-1)).toMatchObject({
      moduleId: "out",
      inputs: { in: "fx:mix" },
    });
  });

  it("keeps a single module single when an instanced control drives it", () => {
    const engine = chain();
    engine.addModule({
      id: "env",
      name: "env",
      moduleType: VideoModuleType.Envelope,
      props: { instances: 3, gate: 1, attack: 0, decay: 0, sustain: 0.5 },
    });
    engine.addRoute({
      kind: "control",
      source: { moduleId: "env", ioName: "out" },
      destination: { moduleId: "fx", ioName: "amount" },
      inMin: 0,
      inMax: 1,
      outMin: 0,
      outMax: 360,
    });
    engine.tick({ now: 0, dt: 0.1 });
    engine.tick({ now: 0.1, dt: 0.1 });

    const fx = engine.passes().filter((p) => p.moduleId === "fx" && !p.compose);

    expect(fx).toHaveLength(1);
    expect(fx[0]?.instance).toBeUndefined();
    expect(fx[0]?.uniforms.amount).toBe(180);
  });

  it("gives each instance its own note through bridged MIDI, MIDI Notes and Envelope", () => {
    const engine = chain();
    engine.updateProps("src", { instances: 2 });
    engine.updateProps("fx", { instances: 2 });
    engine.addModule({
      id: "notes",
      name: "notes",
      moduleType: VideoModuleType.MidiNotes,
      props: { instances: 2 },
    });
    engine.addModule({
      id: "env",
      name: "env",
      moduleType: VideoModuleType.Envelope,
      props: { instances: 2, attack: 0, decay: 0, sustain: 1 },
    });
    const bridged = (to: string) =>
      engine.addRoute({
        kind: "midi",
        source: { moduleId: "sched", ioName: "midi out" },
        destination: { moduleId: to, ioName: "in" },
      });
    bridged("notes");
    bridged("env");
    engine.addRoute({
      kind: "control",
      source: { moduleId: "env", ioName: "out" },
      destination: { moduleId: "fx", ioName: "amount" },
      inMin: 0,
      inMax: 1,
      outMin: 0,
      outMax: 360,
    });
    engine.addRoute({
      kind: "control",
      source: { moduleId: "notes", ioName: "note" },
      destination: { moduleId: "src", ioName: "hue" },
      inMin: 0,
      inMax: 127,
      outMin: 0,
      outMax: 127,
    });
    const note = {
      type: "noteOn",
      note: 60,
      velocity: 1,
      instance: 0,
    } as const;
    engine.midi("notes", "in", note);
    engine.midi("env", "in", note);
    engine.midi("notes", "in", { ...note, note: 64, instance: 1 });
    engine.tick({ now: 0, dt: 0.1 });
    engine.tick({ now: 0.1, dt: 0.1 });

    const passes = engine.passes();

    expect(
      passes
        .filter((p) => p.moduleId === "fx" && !p.compose)
        .map((p) => [p.instance, p.uniforms.amount]),
    ).toEqual([
      [0, 360],
      [1, 0],
    ]);
    expect(
      passes
        .filter((p) => p.moduleId === "src" && !p.compose)
        .map((p) => [p.instance, p.uniforms.hue]),
    ).toEqual([
      [0, 60],
      [1, 64],
    ]);
    expect(
      engine.serialize().routes.filter((r) => r.kind === "midi"),
    ).toHaveLength(2);
  });

  it("accepts a MIDI route from a module it does not know, but not into a port that is not MIDI", () => {
    const engine = new VideoEngine();
    engine.addModule({
      id: "src",
      name: "src",
      moduleType: VideoModuleType.Source,
    });
    engine.addModule({
      id: "fx",
      name: "fx",
      moduleType: VideoModuleType.HueRotate,
    });
    engine.addModule({
      id: "env",
      name: "env",
      moduleType: VideoModuleType.Envelope,
    });

    expect(() =>
      engine.addRoute({
        kind: "midi",
        source: { moduleId: "keys", ioName: "midi out" },
        destination: { moduleId: "env", ioName: "in" },
      }),
    ).not.toThrow();
    expect(() =>
      engine.addRoute({
        kind: "midi",
        source: { moduleId: "keys", ioName: "midi out" },
        destination: { moduleId: "src", ioName: "in" },
      }),
    ).toThrow(/no midi input/);
    expect(() =>
      engine.addRoute({
        source: { moduleId: "keys", ioName: "out" },
        destination: { moduleId: "fx", ioName: "in" },
      }),
    ).toThrow(/not found/);
    expect(() => {
      engine.midi("gone", "in", { type: "noteOn", note: 60, velocity: 1 });
    }).not.toThrow();
  });

  it("lists control outputs by name for readouts, without the host's pushes", () => {
    const engine = chain();
    engine.addModule({
      id: "lfo",
      name: "lfo",
      moduleType: VideoModuleType.LFO,
      props: { waveform: "sawtooth", phase: 0 },
    });
    engine.setControls({ "patch:osc:frequency": 440 });
    engine.tick({ now: 0.25, dt: 0.25 });

    expect(engine.controlValues()).toEqual({ "lfo:out": 0.25 });
  });

  it("reports each Video instance's playback state after a tick", () => {
    const engine = new VideoEngine();
    engine.addModule({
      id: "vid",
      name: "vid",
      moduleType: VideoModuleType.Video,
      props: { instances: 2, seek: 0.3, speed: 2, playing: false },
    });
    engine.tick({ now: 0, dt: 0 });

    expect(engine.mediaState()).toEqual([
      {
        id: "vid",
        instances: [
          { seek: 0.3, speed: 2, playing: false },
          { seek: 0.3, speed: 2, playing: false },
        ],
      },
    ]);
  });

  it("keeps its own copy of spectrum bins and feeds them to a Band", () => {
    const engine = chain();
    engine.addModule({
      id: "band",
      name: "band",
      moduleType: VideoModuleType.Band,
      props: { moduleId: "sp", lowHz: 0, highHz: 1000 },
    });
    engine.addRoute({
      kind: "control",
      source: { moduleId: "band", ioName: "out" },
      destination: { moduleId: "fx", ioName: "amount" },
      inMin: 0,
      inMax: 1,
      outMin: 0,
      outMax: 360,
    });
    const bins = new Float32Array([-30, -100, -65, -100]);
    engine.setSpectrum("sp", bins, 8000);
    bins.fill(-100);
    engine.tick({ now: 0, dt: 0 });

    expect(engine.passes()[1]?.uniforms.amount).toBeCloseTo(180);
  });

  it("updates props", () => {
    const engine = chain();
    engine.updateProps("fx", { amount: 45 });

    expect(engine.findModule("fx").props).toEqual({ amount: 45, instances: 1 });
  });

  it("removing a module drops routes on either end", () => {
    const engine = withAudioProp(chain());
    engine.removeModule("ap");
    expect(engine.serialize().routes.map((r) => r.kind)).toEqual([
      "texture",
      "texture",
    ]);

    engine.removeModule("fx");
    expect(engine.serialize().routes).toEqual([]);
    expect(engine.passes()[0]?.inputs).toEqual({ in: null });
  });

  it("round-trips through serialize and load", () => {
    const engine = withAudioProp(chain());
    const patch = engine.serialize();

    const loaded = new VideoEngine();
    loaded.load(patch);

    expect(loaded.serialize()).toEqual(patch);
  });

  it("loads a patch saved before route kinds and without bindings", () => {
    const patch = chain().serialize();
    const legacy = {
      modules: patch.modules,
      routes: patch.routes.map(({ kind: _kind, ...route }) => route),
      bindings: [{ id: "b", moduleId: "fx", prop: "amount" }],
    };

    const loaded = new VideoEngine();
    loaded.load(legacy as unknown as typeof patch);

    expect(loaded.serialize()).toEqual(patch);
  });

  it("rejects a route to an unknown module", () => {
    expect(() =>
      chain().addRoute({
        source: { moduleId: "src", ioName: "out" },
        destination: { moduleId: "nope", ioName: "in" },
      }),
    ).toThrow(/nope/);
  });

  it("rejects a texture route from a control output", () => {
    const engine = withAudioProp(chain());

    expect(() =>
      engine.addRoute({
        source: { moduleId: "ap", ioName: "out" },
        destination: { moduleId: "out", ioName: "in" },
      }),
    ).toThrow(/texture/);
  });

  it("rejects a control route from a texture output", () => {
    const engine = chain();

    expect(() =>
      engine.addRoute({
        ...control,
        source: { moduleId: "src", ioName: "out" },
      }),
    ).toThrow(/control/);
  });

  it("rejects a control route into a prop the module does not declare", () => {
    const engine = withAudioProp(chain());

    expect(() =>
      engine.addRoute({
        ...control,
        destination: { moduleId: "src", ioName: "mode" },
      }),
    ).toThrow(/mode/);
  });
});
