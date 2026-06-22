import { ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import CompressorBlock from "@/blocks/effects/CompressorBlock";

describe("CompressorBlock", () => {
  it("creates a disabled-by-default compressor effect", () => {
    const block = new CompressorBlock("fx2");
    const module = block.findModule("fx2.main");

    expect(module).toEqual({
      id: "fx2.main",
      name: "Compressor",
      moduleType: ModuleType.Compressor,
      props: {
        threshold: 0,
        ratio: 4,
        knee: 6,
        attack: 0.001,
        release: 0.003,
        makeup: 0,
        mix: 0,
      },
    });
    expect(block.findInput("in").plugs).toEqual([
      { moduleId: "fx2.main", ioName: "in" },
    ]);
    expect(block.findOutput("out").plugs).toEqual([
      { moduleId: "fx2.main", ioName: "out" },
    ]);
  });
});
