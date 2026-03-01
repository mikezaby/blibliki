import { describe, expect, it } from "vitest";
import { IWavetableTable } from "@/modules/Wavetable";
import { WavetablePeriodicWaveFactory } from "@/modules/WavetablePeriodicWaveFactory";

type CreatePeriodicWaveCall = {
  real: number[];
  imag: number[];
  disableNormalization: boolean | undefined;
};

const TABLES: IWavetableTable[] = [
  { real: [0, 0], imag: [0, 0] },
  { real: [0, 0], imag: [0, 1] },
];

const createMockAudioContext = () => {
  const calls: CreatePeriodicWaveCall[] = [];

  const audioContext = {
    createPeriodicWave: (
      real: Float32Array,
      imag: Float32Array,
      options?: PeriodicWaveConstraints,
    ) => {
      calls.push({
        real: Array.from(real),
        imag: Array.from(imag),
        disableNormalization: options?.disableNormalization,
      });

      return { id: calls.length } as unknown as PeriodicWave;
    },
  };

  return {
    audioContext,
    calls,
  };
};

describe("WavetablePeriodicWaveFactory", () => {
  it("memoizes periodic waves for positions in the same cache bucket", () => {
    const { audioContext, calls } = createMockAudioContext();
    const factory = new WavetablePeriodicWaveFactory({
      audioContext: audioContext as never,
      tables: TABLES,
      disableNormalization: false,
    });

    const first = factory.getPeriodicWave(0.12344);
    const second = factory.getPeriodicWave(0.123449);

    expect(first).toBe(second);
    expect(calls).toHaveLength(1);
  });

  it("creates a new periodic wave when the cache bucket changes", () => {
    const { audioContext, calls } = createMockAudioContext();
    const factory = new WavetablePeriodicWaveFactory({
      audioContext: audioContext as never,
      tables: TABLES,
      disableNormalization: false,
    });

    const first = factory.getPeriodicWave(0.12344);
    const second = factory.getPeriodicWave(0.12351);

    expect(first).not.toBe(second);
    expect(calls).toHaveLength(2);
  });

  it("invalidates the memoized waves when tables change", () => {
    const { audioContext, calls } = createMockAudioContext();
    const factory = new WavetablePeriodicWaveFactory({
      audioContext: audioContext as never,
      tables: TABLES,
      disableNormalization: false,
    });

    const first = factory.getPeriodicWave(0.5);

    factory.setTables([
      { real: [0, 0], imag: [0, 0] },
      { real: [0, 0], imag: [0, 2] },
    ]);

    const second = factory.getPeriodicWave(0.5);

    expect(first).not.toBe(second);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.imag).toEqual([0, 1]);
  });

  it("invalidates the memoized waves when disableNormalization changes", () => {
    const { audioContext, calls } = createMockAudioContext();
    const factory = new WavetablePeriodicWaveFactory({
      audioContext: audioContext as never,
      tables: TABLES,
      disableNormalization: false,
    });

    const first = factory.getPeriodicWave(0.2);
    factory.setDisableNormalization(true);
    const second = factory.getPeriodicWave(0.2);

    expect(first).not.toBe(second);
    expect(calls).toHaveLength(2);
    expect(calls[0]?.disableNormalization).toBe(false);
    expect(calls[1]?.disableNormalization).toBe(true);
  });
});
