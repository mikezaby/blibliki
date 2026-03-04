import { describe, expect, it, vi } from "vitest";
import { ModuleType } from "@/modules";

describe("Engine", () => {
  it("disposes midi device manager when engine is disposed", (ctx) => {
    const disposeSpy = vi.spyOn(ctx.engine.midiDeviceManager as any, "dispose");

    ctx.engine.dispose();

    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });

  it("updates MidiMapper active page through controller navigation helpers", (ctx) => {
    const mapperSerialized = ctx.engine.addModule({
      name: "Mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activePage: 0,
        globalMappings: [],
        pages: [
          { name: "Page 1", mappings: [] },
          { name: "Page 2", mappings: [] },
        ],
      },
    });

    const mapper = ctx.engine.findModule(mapperSerialized.id);
    expect(mapper.moduleType).toBe(ModuleType.MidiMapper);

    (ctx.engine as any).nextMidiMapperPage();
    expect((mapper as any).props.activePage).toBe(1);

    (ctx.engine as any).nextMidiMapperPage();
    expect((mapper as any).props.activePage).toBe(1);

    (ctx.engine as any).previousMidiMapperPage();
    expect((mapper as any).props.activePage).toBe(0);
  });
});
