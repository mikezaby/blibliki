import { describe, expect, it } from "vitest";
import MidiEvent from "@/core/midi/MidiEvent";
import { ModuleType } from "@/modules";
import MidiMapper, { IMidiMapperState } from "@/modules/MidiMapper";

describe("MidiMapper", () => {
  it("stores CC mapping values in runtime state instead of persisted props", (ctx) => {
    const gain = ctx.engine.addModule({
      name: "gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1 },
    });

    const midiMapperSerialized = ctx.engine.addModule({
      name: "midi mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activePage: 0,
        pages: [
          {
            name: "Page 1",
            mappings: [
              {
                cc: 21,
                moduleId: gain.id,
                moduleType: ModuleType.Gain,
                propName: "gain",
              },
            ],
          },
        ],
        globalMappings: [{}],
      },
    });
    const midiMapper = ctx.engine.findModule(
      midiMapperSerialized.id,
    ) as MidiMapper;

    const midiEvent = MidiEvent.fromCC(21, 90, ctx.context.currentTime);
    midiMapper.handleCC(midiEvent, ctx.context.currentTime);

    const persistedMapping = midiMapper.props.pages[0]?.mappings[0];
    expect(persistedMapping).toBeDefined();
    expect("value" in (persistedMapping ?? {})).toBe(false);

    const state = midiMapper.state as IMidiMapperState;
    expect(state.pageValues?.[0]?.[0]).toBe(90);
  });

  it("restores page CC feedback from mapped module props on page switch", (ctx) => {
    const gain = ctx.engine.addModule({
      name: "gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1 },
    });

    const midiMapperSerialized = ctx.engine.addModule({
      name: "midi mapper",
      moduleType: ModuleType.MidiMapper,
      props: {
        activePage: 0,
        pages: [
          { name: "Page 1", mappings: [{}] },
          {
            name: "Page 2",
            mappings: [
              {
                cc: 22,
                moduleId: gain.id,
                moduleType: ModuleType.Gain,
                propName: "gain",
              },
            ],
          },
        ],
        globalMappings: [{}],
      },
    });
    const midiMapper = ctx.engine.findModule(
      midiMapperSerialized.id,
    ) as MidiMapper;

    const midiOut = midiMapper.outputs.findByName("midi out") as unknown as {
      onMidiEvent: (event: MidiEvent) => void;
    };
    const sentEvents: MidiEvent[] = [];
    const originalOnMidiEvent = midiOut.onMidiEvent.bind(midiOut);

    midiOut.onMidiEvent = (event: MidiEvent) => {
      sentEvents.push(event);
      originalOnMidiEvent(event);
    };

    midiMapper.props = { activePage: 1 };

    expect(sentEvents).toHaveLength(1);
    expect(sentEvents[0]?.cc).toBe(22);
    expect(sentEvents[0]?.ccValue).toBe(64);
  });
});
