import { describe, expect, it } from "vitest";
import { ModuleType, moduleSchemas } from "@/modules";

describe("Sampler", () => {
  it("supports ModuleType.Sampler for new patches", () => {
    expect((ModuleType as Record<string, unknown>).Sampler).toBe("Sampler");
    const schema = moduleSchemas[ModuleType.Sampler];
    expect(schema.rate).toBeDefined();
    expect(schema.semitones).toBeDefined();
    expect(schema.sampleUrl).toBeDefined();
    expect(schema.reverse).toBeDefined();
    expect(schema.loop).toBeDefined();
    expect(schema.rootMidi).toBeDefined();
    expect(schema.startOffset).toBeDefined();
    expect(schema.endOffset).toBeDefined();
    expect(schema.gain).toBeDefined();
    expect(schema.attack).toBeDefined();
    expect(schema.release).toBeDefined();
    expect((schema as Record<string, unknown>).uploadFile).toBeUndefined();
  });

  it("does not expose Stretch module type anymore", () => {
    expect((ModuleType as Record<string, unknown>).Stretch).toBeUndefined();
    expect(moduleSchemas[ModuleType.Sampler]).toBeDefined();
  });
});
