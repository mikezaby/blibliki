import { describe, expect, it } from "vitest";
import {
  createInstrumentRuntimeModuleId,
  createTrackRuntimeModuleId,
} from "@/core/runtimeIds";

describe("runtime id helpers", () => {
  it("creates deterministic instrument runtime module ids", () => {
    expect(createInstrumentRuntimeModuleId("midiMapper")).toBe(
      "instrument.runtime.midiMapper",
    );
  });

  it("creates deterministic track runtime module ids", () => {
    expect(createTrackRuntimeModuleId("track-1", "voiceScheduler")).toBe(
      "track-1.runtime.voiceScheduler",
    );
  });
});
