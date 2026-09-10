import { afterEach, describe, expect, it, vi } from "vitest";
import { createModule, VideoModuleType } from "@/modules";
import type { ILFOProps } from "@/modules";

const values = new Map<string, number>();

function lfo(props: Partial<ILFOProps> = {}) {
  return createModule({
    name: "lfo",
    moduleType: VideoModuleType.LFO,
    props: { frequency: 1, ...props },
  });
}

// Ticks once per dt and returns the outputs after the last tick.
function run(module: ReturnType<typeof lfo>, dts: number[]) {
  let out: Record<string, number> | null = null;
  let now = 0;
  for (const dt of dts) {
    now += dt;
    out = module.tick(values, { now, dt });
  }

  return out?.out;
}

describe("LFO", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("declares a control input for frequency and one control output", () => {
    const module = lfo();

    expect(module.inputs).toEqual([{ name: "frequency", kind: "control" }]);
    expect(module.outputs).toEqual([{ name: "out", kind: "control" }]);
  });

  it("defaults to a 1 Hz sine at phase 0", () => {
    expect(lfo().props).toEqual({
      frequency: 1,
      waveform: "sine",
      phase: 0,
    });
  });

  it("sine starts at the middle and peaks a quarter period later", () => {
    expect(run(lfo(), [0])).toBeCloseTo(0.5);
    expect(run(lfo(), [0.25])).toBeCloseTo(1);
    expect(run(lfo(), [0.25, 0.25])).toBeCloseTo(0.5);
    expect(run(lfo(), [0.25, 0.25, 0.25])).toBeCloseTo(0);
  });

  it("advances by dt times frequency and wraps", () => {
    expect(run(lfo({ frequency: 2 }), [0.125])).toBeCloseTo(1);
    expect(run(lfo(), [0.25, 0.25, 0.25, 0.25, 0.25])).toBeCloseTo(1);
  });

  it("does not advance on a zero dt", () => {
    expect(run(lfo(), [0, 0, 0])).toBeCloseTo(0.5);
  });

  it("offsets by the phase prop", () => {
    expect(run(lfo({ phase: 0.25 }), [0])).toBeCloseTo(1);
  });

  it("shapes triangle, square and sawtooth over one period", () => {
    const at = (waveform: ILFOProps["waveform"], t: number) =>
      run(lfo({ waveform }), [t]);

    expect(at("triangle", 0)).toBeCloseTo(0);
    expect(at("triangle", 0.5)).toBeCloseTo(1);
    expect(at("triangle", 0.75)).toBeCloseTo(0.5);
    expect(at("square", 0.25)).toBe(1);
    expect(at("square", 0.75)).toBe(0);
    expect(at("sawtooth", 0.25)).toBeCloseTo(0.25);
    expect(at("sawtooth", 0.9)).toBeCloseTo(0.9);
  });

  it("random holds one value per period and draws a new one on wrap", () => {
    vi.spyOn(Math, "random")
      .mockReturnValueOnce(0.2)
      .mockReturnValueOnce(0.7)
      .mockReturnValue(0.9);
    const module = lfo({ waveform: "random" });

    expect(run(module, [0.25])).toBe(0.2);
    expect(run(module, [0.25])).toBe(0.2);
    expect(run(module, [0.6])).toBe(0.7);
  });

  it("ticks with the props it is given, so a driven frequency applies", () => {
    const module = lfo({ frequency: 1 });
    const driven = { ...(module.props as ILFOProps), frequency: 2 };

    expect(
      module.tick(values, { now: 0.125, dt: 0.125 }, driven)?.out,
    ).toBeCloseTo(1);
  });

  it("advances a phase per voice", () => {
    const module = lfo({ waveform: "sawtooth" });
    module.tick(values, { now: 0.25, dt: 0.25 }, undefined, 0);

    expect(
      module.tick(values, { now: 0.5, dt: 0.25 }, undefined, 0)?.out,
    ).toBeCloseTo(0.5);
    expect(
      module.tick(values, { now: 0.5, dt: 0.25 }, undefined, 1)?.out,
    ).toBeCloseTo(0.25);
  });
});
