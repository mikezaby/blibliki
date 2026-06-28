import { TPB } from "@blibliki/transport";
import { describe, expect, it } from "vitest";
import { encodeWav, nextQuantizedTick } from "@/modules/AudioRecorder";

describe("AudioRecorder", () => {
  describe("nextQuantizedTick", () => {
    const ticksPerBar = TPB * 4; // 4/4

    it("returns the same tick in free mode", () => {
      expect(nextQuantizedTick(12345, "free", ticksPerBar)).toBe(12345);
    });

    it("keeps a tick already on the boundary", () => {
      expect(nextQuantizedTick(ticksPerBar, "bar", ticksPerBar)).toBe(
        ticksPerBar,
      );
      expect(nextQuantizedTick(TPB, "beat", ticksPerBar)).toBe(TPB);
    });

    it("rounds up to the next bar", () => {
      expect(nextQuantizedTick(1, "bar", ticksPerBar)).toBe(ticksPerBar);
      expect(nextQuantizedTick(ticksPerBar + 1, "bar", ticksPerBar)).toBe(
        ticksPerBar * 2,
      );
    });

    it("rounds up to the next beat", () => {
      expect(nextQuantizedTick(1, "beat", ticksPerBar)).toBe(TPB);
      expect(nextQuantizedTick(TPB + 5, "beat", ticksPerBar)).toBe(TPB * 2);
    });
  });

  describe("encodeWav", () => {
    it("writes a valid 44-byte header and PCM data", () => {
      const frames = 4;
      const left = new Float32Array([0, 0.5, -0.5, 1]);
      const right = new Float32Array([0, -1, 1, 0]);
      const blob = encodeWav([left, right], 48000);

      // 44 header + frames * channels * 2 bytes
      expect(blob.size).toBe(44 + frames * 2 * 2);
      expect(blob.type).toBe("audio/wav");
    });

    it("handles mono", () => {
      const blob = encodeWav([new Float32Array([0, 1, -1])], 44100);
      expect(blob.size).toBe(44 + 3 * 1 * 2);
    });
  });
});
