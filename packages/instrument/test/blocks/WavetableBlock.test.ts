import { describe, expect, it } from "vitest";
import OscBlock from "@/blocks/source/OscBlock";
import WavetableBlock from "@/blocks/source/WavetableBlock";

describe("WavetableBlock", () => {
  it("starts with the same low gain as the oscillator source", () => {
    const wavetable = new WavetableBlock().findModule("source.main");
    const osc = new OscBlock().findModule("source.main");

    expect(osc.props).toMatchObject({ lowGain: true });
    expect(wavetable.props).toMatchObject({ lowGain: true });
  });
});
