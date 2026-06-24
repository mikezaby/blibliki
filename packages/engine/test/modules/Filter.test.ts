import type { TestContext } from "vitest";
import { describe, it, expect, beforeEach } from "vitest";
import MidiEvent from "@/core/midi/MidiEvent";
import { ModuleType, OscillatorWave, type ModuleParams } from "@/modules";
import Constant from "@/modules/Constant";
import Filter, { type IFilterProps } from "@/modules/Filter";
import Inspector from "@/modules/Inspector";
import Oscillator from "@/modules/Oscillator";
import { waitForInspectorPeakAbove } from "../utils/audioWaits";
import { waitForMicrotasks } from "../utils/waitForCondition";

function createOscillator(ctx: TestContext) {
  const serialized = ctx.engine.addModule({
    name: "Oscillator",
    moduleType: ModuleType.Oscillator,
    props: {
      wave: OscillatorWave.sawtooth,
      frequency: 440,
      fine: 0,
      coarse: 0,
      octave: 0,
      lowGain: true,
    },
    voices: 1,
    monoModuleConstructor: () => {
      throw new Error("Not used in test");
    },
  } as ModuleParams);

  return ctx.engine.findModule(serialized.id) as Oscillator;
}

function createFilter(ctx: TestContext, props: IFilterProps) {
  const serialized = ctx.engine.addModule({
    name: "Filter",
    moduleType: ModuleType.Filter,
    props,
    voices: 1,
    monoModuleConstructor: () => {
      throw new Error("Not used in test");
    },
  } as ModuleParams);

  return ctx.engine.findModule(serialized.id) as Filter;
}

function createConstant(ctx: TestContext, props: { value: number }) {
  const serialized = ctx.engine.addModule({
    name: "Constant",
    moduleType: ModuleType.Constant,
    props,
  });

  return ctx.engine.findModule(serialized.id) as Constant;
}

function createInspector(ctx: TestContext) {
  const serialized = ctx.engine.addModule({
    name: "inspector",
    moduleType: ModuleType.Inspector,
    props: {},
  });

  return ctx.engine.findModule(serialized.id) as Inspector;
}

describe("Filter", () => {
  describe("Filter with low cutoff and constant modulation", () => {
    let filter: Filter;
    let oscillator: Oscillator;
    let constant: Constant;
    let inspector: Inspector;

    beforeEach(async (ctx) => {
      // Create an oscillator as audio source
      oscillator = createOscillator(ctx);

      // Create filter with low cutoff but full modulation amount
      filter = createFilter(ctx, {
        cutoff: 20, // Very low cutoff
        envelopeAmount: 1, // Full modulation amount
        keyTrack: 0,
        type: "lowpass",
        Q: 1,
      });

      // Create constant to modulate filter
      constant = createConstant(ctx, {
        value: 1, // Maximum modulation
      });
      constant.start(ctx.context.currentTime);

      // Create inspector to measure output
      inspector = createInspector(ctx);

      await waitForMicrotasks();

      // Get mono modules
      const monoOscillator = oscillator.audioModules[0]!;
      const monoFilter = filter.audioModules[0]!;

      // Start the oscillator
      monoOscillator.start(ctx.context.currentTime);

      // Connect: Oscillator -> Filter -> Inspector
      monoOscillator.plug({ audioModule: monoFilter, from: "out", to: "in" });
      (monoFilter.audioNode as any).connect(inspector.audioNode);

      // Connect: Constant -> Filter cutoffMod (bypassing envelope)
      constant.plug({ audioModule: monoFilter, from: "out", to: "cutoffMod" });
    });

    it("should output audio when constant modulates filter to high frequency", async () => {
      const audioOutput = await waitForInspectorPeakAbove(inspector, 0.05, {
        description: "filter output with cutoff modulation",
      });

      // With constant(1) modulating, filter should open to 20kHz
      // Sawtooth with lowGain passes through filter at reduced amplitude
      expect(audioOutput).toBeGreaterThan(0.05);
    });
  });

  describe("Filter with high cutoff frequency", () => {
    let filter: Filter;
    let oscillator: Oscillator;
    let inspector: Inspector;

    beforeEach(async (ctx) => {
      // Create an oscillator as audio source
      oscillator = createOscillator(ctx);

      // Create filter with HIGH cutoff (should let audio through)
      filter = createFilter(ctx, {
        cutoff: 20000, // High cutoff - should let audio through
        envelopeAmount: 0, // No modulation
        keyTrack: 0,
        type: "lowpass",
        Q: 1,
      });

      // Create inspector to measure output
      inspector = createInspector(ctx);

      await waitForMicrotasks();

      // Get mono modules
      const monoOscillator = oscillator.audioModules[0]!;
      const monoFilter = filter.audioModules[0]!;

      // Start the oscillator
      monoOscillator.start(ctx.context.currentTime);

      // Connect: Oscillator -> Filter -> Inspector
      monoOscillator.plug({ audioModule: monoFilter, from: "out", to: "in" });
      (monoFilter.audioNode as any).connect(inspector.audioNode);
    });

    it("should output audio with high cutoff frequency", async () => {
      const audioOutput = await waitForInspectorPeakAbove(inspector, 0.05, {
        description: "filter output with open cutoff",
      });

      // With high cutoff, audio should pass through
      // Sawtooth with lowGain passes through filter at reduced amplitude
      expect(audioOutput).toBeGreaterThan(0.05);
    });
  });

  describe("Filter initialization", () => {
    it("should initialize with correct default props", (ctx) => {
      const filter = createFilter(ctx, {
        cutoff: 20000,
        envelopeAmount: 0,
        keyTrack: 0,
        type: "lowpass",
        Q: 1,
      });

      expect(filter.props.cutoff).toBe(20000); // Default MAX_FREQ
      expect(filter.props.envelopeAmount).toBe(0);
      expect(filter.props.keyTrack).toBe(0);
      expect(filter.props.type).toBe("lowpass");
      expect(filter.props.Q).toBe(1);
    });

    it("should initialize with custom props", (ctx) => {
      const filter = createFilter(ctx, {
        cutoff: 1000,
        envelopeAmount: 0.5,
        keyTrack: 0.75,
        type: "highpass",
        Q: 2,
      });

      expect(filter.props.cutoff).toBe(1000);
      expect(filter.props.envelopeAmount).toBe(0.5);
      expect(filter.props.keyTrack).toBe(0.75);
      expect(filter.props.type).toBe("highpass");
      expect(filter.props.Q).toBe(2);
    });
  });

  describe("Key tracking", () => {
    it("keeps the last tracked cutoff after note release until the next attack", async (ctx) => {
      const filter = createFilter(ctx, {
        cutoff: 1000,
        envelopeAmount: 0,
        keyTrack: 1,
        type: "lowpass",
        Q: 1,
      });

      await waitForMicrotasks();

      const monoFilter = filter.audioModules[0] as any;

      expect(monoFilter.scale.props.current).toBe(1000);

      // This behavior is centered on exact C2 / MIDI 48.
      // In this codebase, C3 is one octave above that pivot.
      filter.onMidiEvent(
        MidiEvent.fromNote("C3", true, ctx.context.currentTime),
      );
      expect(monoFilter.scale.props.current).toBeCloseTo(2000, 5);

      filter.onMidiEvent(
        MidiEvent.fromNote("C3", false, ctx.context.currentTime),
      );
      expect(monoFilter.scale.props.current).toBeCloseTo(2000, 5);

      filter.onMidiEvent(
        MidiEvent.fromNote("C2", true, ctx.context.currentTime),
      );
      expect(monoFilter.scale.props.current).toBe(1000);
    });

    it("inverts cutoff tracking when keyTrack is -1", async (ctx) => {
      const filter = createFilter(ctx, {
        cutoff: 1000,
        envelopeAmount: 0,
        keyTrack: -1,
        type: "lowpass",
        Q: 1,
      });

      await waitForMicrotasks();

      const monoFilter = filter.audioModules[0] as any;

      filter.onMidiEvent(
        MidiEvent.fromNote("C3", true, ctx.context.currentTime),
      );
      expect(monoFilter.scale.props.current).toBeCloseTo(500, 5);
    });
  });
});
