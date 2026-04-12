import { ModuleType } from "@blibliki/engine";
import { describe, expect, it } from "vitest";
import DrumMachineBlock from "@/blocks/source/DrumMachineBlock";

describe("DrumMachineBlock", () => {
  it("fans out the exported midi input to the drum machine module", () => {
    const block = new DrumMachineBlock();

    expect(block.findInput("midi in").plugs).toEqual([
      { moduleId: "source.main", ioName: "midi in" },
    ]);
  });

  it("exports the summed drum mix from the main out plug", () => {
    const block = new DrumMachineBlock();

    expect(block.findOutput("out").plugs).toEqual([
      { moduleId: "source.main", ioName: "out" },
    ]);
  });

  it("exposes the drum machine module and its main kit-control slots", () => {
    const block = new DrumMachineBlock();
    const mainModule = block.findModule("source.main");

    expect(mainModule.moduleType).toBe(ModuleType.DrumMachine);
    expect(Array.from(block.slots.keys())).toEqual(
      expect.arrayContaining([
        "masterLevel",
        "kickLevel",
        "snareLevel",
        "tomLevel",
        "clapLevel",
        "cowbellLevel",
        "cymbalLevel",
        "openHatLevel",
        "closedHatLevel",
      ]),
    );
  });
});
