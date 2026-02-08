import { describe, expect, it } from "vitest";
import {
  encodeWavPcm16,
  exportWavetableScanToWavBytes,
  extractEmbeddedWavetableTablesFromWavBytes,
  extractWavetableTablesFromSamples,
  renderWavetableScanSamples,
} from "@/utils/WavetableWav";

const readAscii = (bytes: Uint8Array, start: number, length: number) => {
  return String.fromCharCode(...bytes.slice(start, start + length));
};

describe("WavetableWav utils", () => {
  it("extracts deterministic tables from PCM samples", () => {
    const sampleRate = 44100;
    const source = new Float32Array(4096);

    for (let i = 0; i < source.length; i += 1) {
      source[i] = Math.sin((2 * Math.PI * 220 * i) / sampleRate);
    }

    const tables = extractWavetableTablesFromSamples(source, {
      tableCount: 8,
      frameSize: 256,
      harmonics: 32,
    });

    expect(tables).toHaveLength(8);
    tables.forEach((table) => {
      expect(table.real).toHaveLength(32);
      expect(table.imag).toHaveLength(32);
      expect(Number.isFinite(table.real[1])).toBe(true);
      expect(Number.isFinite(table.imag[1])).toBe(true);
    });
  });

  it("renders a scan waveform from a table bank", () => {
    const samples = renderWavetableScanSamples({
      tables: [
        { real: [0, 0], imag: [0, 1] },
        { real: [0, 0, 0.25], imag: [0, 0.2, 0.7] },
      ],
      sampleRate: 8000,
      durationSeconds: 0.25,
      frequency: 220,
    });

    expect(samples).toHaveLength(2000);
    const peak = samples.reduce((max, value) => {
      return Math.max(max, Math.abs(value));
    }, 0);
    expect(peak).toBeGreaterThan(0.01);
  });

  it("encodes PCM samples to valid 16-bit WAV bytes", () => {
    const bytes = encodeWavPcm16(new Float32Array([0, -1, 1, 0.5]), 8000);

    expect(readAscii(bytes, 0, 4)).toBe("RIFF");
    expect(readAscii(bytes, 8, 4)).toBe("WAVE");
    expect(readAscii(bytes, 12, 4)).toBe("fmt ");
    expect(readAscii(bytes, 36, 4)).toBe("data");
    expect(bytes.length).toBe(44 + 8);
  });

  it("exports frame-sequence WAV for wavetable import", () => {
    const bytes = exportWavetableScanToWavBytes({
      tables: [
        { real: [0, 0], imag: [0, 1] },
        { real: [0, 0, 0.5], imag: [0, 0.1, 0.4] },
      ],
      sampleRate: 11025,
      frameSampleCount: 1024,
    });

    expect(readAscii(bytes, 0, 4)).toBe("RIFF");
    expect(readAscii(bytes, 8, 4)).toBe("WAVE");
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    expect(view.getUint32(40, true)).toBe(2 * 1024 * 2);
  });

  it("roundtrips exact tables through embedded WAV metadata", () => {
    const tables = [
      { real: [0, 0, 0.5, -0.1], imag: [0, 1, 0.2, 0.05] },
      { real: [0, 0, 0.15, 0.35], imag: [0, 0.45, -0.25, 0.1] },
    ];
    const bytes = exportWavetableScanToWavBytes({
      tables,
      sampleRate: 22050,
      frameSampleCount: 2048,
    });

    const restored = extractEmbeddedWavetableTablesFromWavBytes(bytes);
    expect(restored).toEqual(tables);
  });
});
