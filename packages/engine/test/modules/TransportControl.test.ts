import { describe, expect, it } from "vitest";
import { ModuleType } from "@/modules";

describe("TransportControl", () => {
  it("applies bpm and swing props to the engine transport on construction", (ctx) => {
    ctx.engine.addModule({
      name: "Transport Control",
      moduleType: "TransportControl" as ModuleType,
      props: {
        bpm: 96,
        swing: 0.4,
      },
    });

    expect(ctx.engine.transport.bpm).toBe(96);
    expect(ctx.engine.transport.swingAmount).toBe(0.6);
  });

  it("updates the engine transport when props change", (ctx) => {
    const serialized = ctx.engine.addModule({
      name: "Transport Control",
      moduleType: "TransportControl" as ModuleType,
      props: {
        bpm: 120,
        swing: 0,
      },
    });

    const transportControl = ctx.engine.findModule(serialized.id);
    (transportControl as { props: { bpm: number; swing: number } }).props = {
      bpm: 140,
      swing: 1,
    };

    expect(ctx.engine.transport.bpm).toBe(140);
    expect(ctx.engine.transport.swingAmount).toBe(0.75);
  });
});
