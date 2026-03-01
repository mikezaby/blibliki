import { sleep } from "@blibliki/utils";
import { describe, expect, it } from "vitest";
import { ModuleType } from "@/modules";
import Inspector from "@/modules/Inspector";
import Wavetable, {
  formatWavetableConfig,
  IWavetableProps,
  parseWavetableConfig,
  formatWavetableDefinition,
  parseWavetableDefinition,
} from "@/modules/Wavetable";

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
  disableNormalization: false,
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

    await sleep(10);

    const monoOscillator = oscillator.audioModules[0]!;
    monoOscillator.start(ctx.context.currentTime);
    ctx.engine.transport.start(ctx.context.currentTime);
    monoOscillator.plug({ audioModule: inspector, from: "out", to: "in" });

    await sleep(50);
    const lowPositionPeak = inspector.getValues().reduce((max, value) => {
      return Math.max(max, Math.abs(value));
    }, 0);

    oscillator.props = {
      position: 1,
    };
    await sleep(50);
    ctx.engine.transport.stop(ctx.context.currentTime);

    const highPositionPeak = inspector.getValues().reduce((max, value) => {
      return Math.max(max, Math.abs(value));
    }, 0);

    expect(lowPositionPeak).toBeLessThan(0.01);
    expect(highPositionPeak).toBeGreaterThan(0.01);
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

    await sleep(10);

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

    await sleep(50);

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

    await sleep(10);
    const monoOscillator = oscillator.audioModules[0]!;
    monoOscillator.start(ctx.context.currentTime);
    ctx.engine.transport.start(ctx.context.currentTime);
    oscillator.props = { position: 1 };
    await sleep(120);
    ctx.engine.transport.stop(ctx.context.currentTime);

    const stateUpdates = updates.filter(
      (update) => typeof update.state?.actualPosition === "number",
    );

    expect(stateUpdates.length).toBeGreaterThan(0);
    expect(
      stateUpdates[stateUpdates.length - 1]?.state?.actualPosition,
    ).toEqual(expect.any(Number));
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
