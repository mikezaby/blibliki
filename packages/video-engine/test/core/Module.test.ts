import { describe, expect, it } from "vitest";
import { createModule, VideoModuleType } from "@/modules";

describe("VideoModule", () => {
  it("merges defaults with given props and serializes", () => {
    const source = createModule({
      name: "src",
      moduleType: VideoModuleType.Source,
      props: { hue: 120 },
    });

    expect(source.props).toEqual({
      mode: "solid",
      hue: 120,
      saturation: 1,
      lightness: 0.5,
      spread: 180,
    });
    expect(source.serialize()).toEqual({
      id: source.id,
      name: "src",
      moduleType: VideoModuleType.Source,
      props: source.props,
    });
    expect(source.inputs).toEqual([]);
  });

  it("keeps a given id", () => {
    const source = createModule({
      id: "fixed",
      name: "src",
      moduleType: VideoModuleType.Source,
      props: {},
    });

    expect(source.id).toBe("fixed");
  });
});
