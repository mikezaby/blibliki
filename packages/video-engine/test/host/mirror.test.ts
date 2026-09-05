import { describe, expect, it } from "vitest";
import { propsToControls } from "@/host/mirror";

describe("propsToControls", () => {
  it("names numeric props by module id and prop, skipping the rest", () => {
    expect(
      propsToControls("osc", {
        frequency: 440,
        wave: "sine",
        enabled: true,
        detune: 0,
      }),
    ).toEqual({ "patch:osc:frequency": 440, "patch:osc:detune": 0 });
  });
});
