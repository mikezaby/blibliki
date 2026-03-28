import { describe, expect, it } from "vitest";
import { ModuleType } from "@/modules";
import Inspector from "@/modules/Inspector";
import Wavetable, {
  formatWavetableConfig,
  IWavetableProps,
  formatWavetableDefinition,
  parseWavetableConfig,
  parseWavetableDefinition,
} from "@/modules/Wavetable";
import {
  readInspectorPeak,
  waitForInspectorPeakAbove,
} from "../utils/audioWaits";
import { waitForCondition, waitForMicrotasks } from "../utils/waitForCondition";

const DEFAULT_PROPS: IWavetableProps = {
  tables: [
    {
      real: [0, 0],
      imag: [0, 0],
    },
    {
      real: [0, 0],
      imag: [0, 1],
    },
  ],
  position: 0,
  frequency: 440,
  fine: 0,
  coarse: 0,
  octave: 0,
  lowGain: false,
};

describe("Wavetable", () => {
  it("supports ModuleType.Wavetable alias for new patches", (ctx) => {
    expect((ModuleType as Record<string, unknown>).Wavetable).toBe("Wavetable");

    const wavetable = new Wavetable(ctx.engine.id, {
      name: "Wavetable",
      moduleType: ModuleType.Wavetable,
      props: DEFAULT_PROPS,
      voices: 1,
      monoModuleConstructor: () => {
        throw new Error("Not used in test");
      },
    });

    expect(wavetable.moduleType).toBe("Wavetable");
  });

  it("uses table bank props without mode/fold/wrap", (ctx) => {
    const oscillator = new Wavetable(ctx.engine.id, {
      name: "Wavetable Oscillator",
      moduleType: ModuleType.Wavetable,
      props: DEFAULT_PROPS,
      voices: 1,
      monoModuleConstructor: () => {
        throw new Error("Not used in test");
      },
    });

    expect(oscillator.moduleType).toBe(ModuleType.Wavetable);
    expect((oscillator.props as any).tables.length).toBe(2);
    expect((oscillator.props as any).mode).toBeUndefined();
    expect((oscillator.props as any).fold).toBeUndefined();
    expect((oscillator.props as any).wrap).toBeUndefined();
  });

  it("interpolates output between table steps based on position", async (ctx) => {
    const oscillator = new Wavetable(ctx.engine.id, {
      name: "Wavetable Oscillator",
      moduleType: ModuleType.Wavetable,
      props: DEFAULT_PROPS,
      voices: 1,
      monoModuleConstructor: () => {
        throw new Error("Not used in test");
      },
    });
    const inspector = new Inspector(ctx.engine.id, {
      name: "inspector",
      moduleType: ModuleType.Inspector,
      props: {},
    });

    await waitForMicrotasks();

    const monoOscillator = oscillator.audioModules[0]!;
    monoOscillator.start(ctx.context.currentTime);
    ctx.engine.transport.start(ctx.context.currentTime);
    monoOscillator.plug({ audioModule: inspector, from: "out", to: "in" });

    const lowPositionPeak = readInspectorPeak(inspector);

    oscillator.props = {
      position: 1,
    };
    const highPositionPeak = await waitForInspectorPeakAbove(inspector, 0.01, {
      description: "wavetable output after moving to position 1",
    });
    ctx.engine.transport.stop(ctx.context.currentTime);

    expect(lowPositionPeak).toBeLessThan(0.01);
    expect(highPositionPeak).toBeGreaterThan(0.01);
  });

  it("updates output on position changes without starting transport", async (ctx) => {
    const oscillator = new Wavetable(ctx.engine.id, {
      name: "Wavetable Oscillator",
      moduleType: ModuleType.Wavetable,
      props: DEFAULT_PROPS,
      voices: 1,
      monoModuleConstructor: () => {
        throw new Error("Not used in test");
      },
    });
    const inspector = new Inspector(ctx.engine.id, {
      name: "inspector",
      moduleType: ModuleType.Inspector,
      props: {},
    });

    await waitForMicrotasks();

    const monoOscillator = oscillator.audioModules[0]!;
    monoOscillator.start(ctx.context.currentTime);
    monoOscillator.plug({ audioModule: inspector, from: "out", to: "in" });

    const lowPositionPeak = readInspectorPeak(inspector);

    oscillator.props = { position: 1 };
    const highPositionPeak = await waitForInspectorPeakAbove(inspector, 0.01, {
      description: "wavetable output after position change without transport",
    });

    expect(lowPositionPeak).toBeLessThan(0.01);
    expect(highPositionPeak).toBeGreaterThan(0.01);
  });

  it("updates output when tables are changed during playback", async (ctx) => {
    const oscillator = new Wavetable(ctx.engine.id, {
      name: "Wavetable Oscillator",
      moduleType: ModuleType.Wavetable,
      props: {
        ...DEFAULT_PROPS,
        position: 1,
      },
      voices: 1,
      monoModuleConstructor: () => {
        throw new Error("Not used in test");
      },
    });
    const inspector = new Inspector(ctx.engine.id, {
      name: "inspector",
      moduleType: ModuleType.Inspector,
      props: {},
    });

    await waitForMicrotasks();

    const monoOscillator = oscillator.audioModules[0]!;
    monoOscillator.start(ctx.context.currentTime);
    ctx.engine.transport.start(ctx.context.currentTime);
    monoOscillator.plug({ audioModule: inspector, from: "out", to: "in" });

    const beforePresetChangePeak = await waitForInspectorPeakAbove(
      inspector,
      0.01,
    );

    oscillator.props = {
      tables: [
        { real: [0, 0], imag: [0, 0] },
        { real: [0, 0], imag: [0, 0] },
      ],
    };

    await waitForCondition(() => readInspectorPeak(inspector) < 0.01);
    ctx.engine.transport.stop(ctx.context.currentTime);

    const afterPresetChangePeak = readInspectorPeak(inspector);

    expect(beforePresetChangePeak).toBeGreaterThan(0.01);
    expect(afterPresetChangePeak).toBeLessThan(0.01);
  });

  it("stays stable with mismatched table harmonic lengths", async (ctx) => {
    const oscillator = new Wavetable(ctx.engine.id, {
      name: "Wavetable Oscillator",
      moduleType: ModuleType.Wavetable,
      props: DEFAULT_PROPS,
      voices: 1,
      monoModuleConstructor: () => {
        throw new Error("Not used in test");
      },
    });
    const inspector = new Inspector(ctx.engine.id, {
      name: "inspector",
      moduleType: ModuleType.Inspector,
      props: {},
    });

    await waitForMicrotasks();

    oscillator.props = {
      tables: [
        { real: [0, 0, 1, 0.5], imag: [0, 1] },
        { real: [0, 0], imag: [0, 1, 0.2, 0.1, 0.05] },
      ],
      position: 0.4,
    };

    const monoOscillator = oscillator.audioModules[0]!;
    monoOscillator.start(ctx.context.currentTime);
    monoOscillator.plug({ audioModule: inspector, from: "out", to: "in" });

    expect(Number.isFinite(inspector.getValue())).toBe(true);
  });

  it("publishes actual position in runtime state for UI visualization", async (ctx) => {
    const updates: Array<{ state?: { actualPosition?: number } }> = [];
    const oscillator = new Wavetable(ctx.engine.id, {
      name: "Wavetable Oscillator",
      moduleType: ModuleType.Wavetable,
      props: DEFAULT_PROPS,
      voices: 1,
      monoModuleConstructor: () => {
        throw new Error("Not used in test");
      },
    });

    ctx.engine.onPropsUpdate((update) => {
      if (update.id !== oscillator.id) return;

      updates.push({
        state:
          update.state &&
          typeof update.state === "object" &&
          "actualPosition" in update.state
            ? {
                actualPosition: (update.state as { actualPosition?: number })
                  .actualPosition,
              }
            : undefined,
      });
    });

    await waitForMicrotasks();
    const monoOscillator = oscillator.audioModules[0]!;
    monoOscillator.start(ctx.context.currentTime);
    ctx.engine.transport.start(ctx.context.currentTime);
    oscillator.props = { position: 1 };
    await waitForCondition(
      () =>
        updates.some(
          (update) => typeof update.state?.actualPosition === "number",
        ),
      {
        timeoutMs: 3000,
        description: "wavetable actualPosition state updates",
      },
    );
    ctx.engine.transport.stop(ctx.context.currentTime);

    const stateUpdates = updates.filter(
      (update) => typeof update.state?.actualPosition === "number",
    );

    expect(stateUpdates.length).toBeGreaterThan(0);
    expect(
      stateUpdates[stateUpdates.length - 1]?.state?.actualPosition,
    ).toEqual(expect.any(Number));
  });

  it("publishes smoothed runtime position instead of jumping directly to target", async (ctx) => {
    const updates: number[] = [];
    const oscillator = new Wavetable(ctx.engine.id, {
      name: "Wavetable Oscillator",
      moduleType: ModuleType.Wavetable,
      props: DEFAULT_PROPS,
      voices: 1,
      monoModuleConstructor: () => {
        throw new Error("Not used in test");
      },
    });
    const inspector = new Inspector(ctx.engine.id, {
      name: "inspector",
      moduleType: ModuleType.Inspector,
      props: {},
    });

    ctx.engine.onPropsUpdate((update) => {
      if (update.id !== oscillator.id) return;
      if (
        update.state &&
        typeof update.state === "object" &&
        typeof (update.state as { actualPosition?: unknown }).actualPosition ===
          "number"
      ) {
        updates.push(
          (update.state as { actualPosition: number }).actualPosition,
        );
      }
    });

    await waitForMicrotasks();

    const monoOscillator = oscillator.audioModules[0]!;
    monoOscillator.start(ctx.context.currentTime);
    monoOscillator.plug({ audioModule: inspector, from: "out", to: "in" });

    await waitForCondition(() => updates.length > 0, {
      timeoutMs: 3000,
      description: "initial wavetable actualPosition report",
    });
    updates.length = 0;

    oscillator.props = { position: 1 };
    await waitForCondition(
      () => updates.some((actualPosition) => actualPosition > 0.05),
      { timeoutMs: 3000 },
    );
    inspector.getValues();

    const intermediateUpdate = updates.find(
      (actualPosition) => actualPosition > 0.05 && actualPosition < 0.95,
    );

    await waitForCondition(() => (updates[updates.length - 1] ?? 0) > 0.95, {
      timeoutMs: 3000,
    });
    inspector.getValues();

    const latest = updates[updates.length - 1] ?? 0;

    expect(intermediateUpdate).toBeDefined();
    expect(latest).toBeGreaterThan(0.95);
  });

  describe("wavetable text format", () => {
    it("parses plain object format with quoted keys", () => {
      const source = `
      {
        'real': [0, 0, 0.45, 0.2],
        'imag': [0, 1, 0.12, -0.03],
      }
      `;

      const parsed = parseWavetableDefinition(source);

      expect(parsed.real).toEqual([0, 0, 0.45, 0.2]);
      expect(parsed.imag).toEqual([0, 1, 0.12, -0.03]);
    });

    it("formats wavetable definitions as a plain object", () => {
      const formatted = formatWavetableDefinition({
        real: [0, 0, 0.5],
        imag: [0, 1, 0.25],
      });

      expect(formatted).toContain('"real": [');
      expect(formatted).toContain('"imag": [');
      expect(formatted).not.toContain("var ");
      expect(formatted).not.toContain("name:");
    });

    it("throws when real or imag arrays are missing", () => {
      expect(() =>
        parseWavetableDefinition(`{ name: "Broken", real: [0, 1] }`),
      ).toThrow("both real and imag arrays");
    });

    it("parses wavetable config with multiple tables", () => {
      const source = `
      {
        "tables": [
          { "real": [0, 0], "imag": [0, 0] },
          { "real": [0, 0], "imag": [0, 1] },
          { "real": [0, 0, 0.3], "imag": [0, 1, 0.15] }
        ]
      }
      `;

      const parsed = parseWavetableConfig(source);
      expect(parsed.tables.length).toBe(3);
      expect(parsed.tables[2]?.real).toEqual([0, 0, 0.3]);
      expect(parsed.tables[2]?.imag).toEqual([0, 1, 0.15]);
    });

    it("formats wavetable config as tables JSON object", () => {
      const formatted = formatWavetableConfig({
        tables: [
          { real: [0, 0], imag: [0, 0] },
          { real: [0, 0], imag: [0, 1] },
        ],
      });

      expect(formatted).toContain('"tables": [');
      expect(formatted).toContain('"real": [');
      expect(formatted).toContain('"imag": [');
    });
  });
});
