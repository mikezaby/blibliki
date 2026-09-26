import { describe, expect, it } from "vitest";
import { ModuleType } from "@/modules";

describe("MIDI input schema", () => {
  it("serializes a midi input without a schema as free", (ctx) => {
    const gain = ctx.engine.addModule({
      name: "gain",
      moduleType: ModuleType.Gain,
      props: {},
    });

    expect(gain.inputs.find((io) => io.name === "midi in")?.schema).toEqual({
      kind: "free",
    });
  });

  it("serializes the drum machine midi input with its named notes", (ctx) => {
    const drumMachine = ctx.engine.addModule({
      name: "drums",
      moduleType: ModuleType.DrumMachine,
      props: {},
    });

    const schema = drumMachine.inputs.find(
      (io) => io.name === "midi in",
    )?.schema;

    expect(schema?.kind).toBe("mapped");
    expect(schema?.kind === "mapped" && schema.notes[0]).toEqual({
      key: "kick",
      note: "C3",
      label: "Kick",
    });
  });

  it("leaves audio IOs without a schema", (ctx) => {
    const gain = ctx.engine.addModule({
      name: "gain",
      moduleType: ModuleType.Gain,
      props: {},
    });

    expect(gain.inputs.find((io) => io.name === "in")).not.toHaveProperty(
      "schema",
    );
  });
});
