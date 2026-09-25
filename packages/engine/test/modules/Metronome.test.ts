import { describe, expect, it } from "vitest";
import { ModuleType } from "@/modules";
import Metronome from "@/modules/Metronome";

describe("Metronome", () => {
  it("counts a bar in from now and says when the transport should start", (ctx) => {
    ctx.engine.bpm = 120;
    const metronome = new Metronome(ctx.engine.id, {
      name: "metronome",
      moduleType: ModuleType.Metronome,
      props: { enabled: false },
    });

    const startAt = metronome.countIn(1);

    // Four beats at 120 BPM, after a short lead so the first click can be
    // scheduled ahead of the audio thread.
    expect(startAt).toBeCloseTo(ctx.context.currentTime + 0.05 + 2, 2);
    expect(metronome.outputs.findByName("out").isAudio()).toBe(true);
  });
});
