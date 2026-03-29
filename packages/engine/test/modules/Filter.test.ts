import { describe, it, expect, beforeEach } from "vitest";
import MidiEvent from "@/core/midi/MidiEvent";
import { ModuleType, OscillatorWave } from "@/modules";
import Constant from "@/modules/Constant";
import Filter from "@/modules/Filter";
import Inspector from "@/modules/Inspector";
import Oscillator from "@/modules/Oscillator";
import { waitForCondition, waitForMicrotasks } from "../utils/waitForCondition";

describe("Filter", () => {
  describe("Filter with low cutoff and constant modulation", () => {
    let filter: Filter;
    let oscillator: Oscillator;
    let constant: Constant;
    let inspector: Inspector;

    beforeEach(async (ctx) => {
      // Create an oscillator as audio source
      oscillator = new Oscillator(ctx.engine.id, {
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
      });

      // Create filter with low cutoff but full modulation amount
      filter = new Filter(ctx.engine.id, {
        name: "Filter",
        moduleType: ModuleType.Filter,
        props: {
          cutoff: 20, // Very low cutoff
          envelopeAmount: 1, // Full modulation amount
          keyTrack: 0,
          type: "lowpass",
          Q: 1,
        },
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      // Create constant to modulate filter
      constant = new Constant(ctx.engine.id, {
        name: "Constant",
        moduleType: ModuleType.Constant,
        props: {
          value: 1, // Maximum modulation
        },
      });
      constant.start(ctx.context.currentTime);

      // Create inspector to measure output
      inspector = new Inspector(ctx.engine.id, {
        name: "inspector",
        moduleType: ModuleType.Inspector,
        props: {},
      });

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
      await waitForCondition(() => Math.abs(inspector.getValue()) > 0.05, {
        description: "filter output with cutoff modulation",
      });

      const audioOutput = inspector.getValue();
      // With constant(1) modulating, filter should open to 20kHz
      // Sawtooth with lowGain passes through filter at reduced amplitude
      expect(Math.abs(audioOutput)).toBeGreaterThan(0.05);
    });
  });

  describe("Filter with high cutoff frequency", () => {
    let filter: Filter;
    let oscillator: Oscillator;
    let inspector: Inspector;

    beforeEach(async (ctx) => {
      // Create an oscillator as audio source
      oscillator = new Oscillator(ctx.engine.id, {
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
      });

      // Create filter with HIGH cutoff (should let audio through)
      filter = new Filter(ctx.engine.id, {
        name: "Filter",
        moduleType: ModuleType.Filter,
        props: {
          cutoff: 20000, // High cutoff - should let audio through
          envelopeAmount: 0, // No modulation
          keyTrack: 0,
          type: "lowpass",
          Q: 1,
        },
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      // Create inspector to measure output
      inspector = new Inspector(ctx.engine.id, {
        name: "inspector",
        moduleType: ModuleType.Inspector,
        props: {},
      });

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
      await waitForCondition(() => Math.abs(inspector.getValue()) > 0.05, {
        description: "filter output with open cutoff",
      });

      const audioOutput = inspector.getValue();
      // With high cutoff, audio should pass through
      // Sawtooth with lowGain passes through filter at reduced amplitude
      expect(Math.abs(audioOutput)).toBeGreaterThan(0.05);
    });
  });

  describe("Filter initialization", () => {
    it("should initialize with correct default props", (ctx) => {
      const filter = new Filter(ctx.engine.id, {
        name: "Filter",
        moduleType: ModuleType.Filter,
        props: {
          cutoff: 20000,
          envelopeAmount: 0,
          keyTrack: 0,
          type: "lowpass",
          Q: 1,
        },
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
      });

      expect(filter.props.cutoff).toBe(20000); // Default MAX_FREQ
      expect(filter.props.envelopeAmount).toBe(0);
      expect(filter.props.keyTrack).toBe(0);
      expect(filter.props.type).toBe("lowpass");
      expect(filter.props.Q).toBe(1);
    });

    it("should initialize with custom props", (ctx) => {
      const filter = new Filter(ctx.engine.id, {
        name: "Filter",
        moduleType: ModuleType.Filter,
        props: {
          cutoff: 1000,
          envelopeAmount: 0.5,
          keyTrack: 0.75,
          type: "highpass",
          Q: 2,
        },
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
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
      const filter = new Filter(ctx.engine.id, {
        name: "Filter",
        moduleType: ModuleType.Filter,
        props: {
          cutoff: 1000,
          envelopeAmount: 0,
          keyTrack: 1,
          type: "lowpass",
          Q: 1,
        },
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
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
      const filter = new Filter(ctx.engine.id, {
        name: "Filter",
        moduleType: ModuleType.Filter,
        props: {
          cutoff: 1000,
          envelopeAmount: 0,
          keyTrack: -1,
          type: "lowpass",
          Q: 1,
        },
        voices: 1,
        monoModuleConstructor: () => {
          throw new Error("Not used in test");
        },
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
