import { describe, expect, it } from "vitest";
import { createDefaultInstrumentDocument } from "@/document/defaultDocument";
import {
  DEFAULT_HARDWARE_PROFILE_ID,
  getHardwareProfile,
} from "@/profiles/hardwareProfile";
import { DEFAULT_TEMPLATE_ID, getTemplate } from "@/templates/defaultTemplate";

describe("createDefaultInstrumentDocument metadata", () => {
  it("uses the known template and hardware profile registries", () => {
    const document = createDefaultInstrumentDocument();
    const template = getTemplate(
      document.templateId as typeof DEFAULT_TEMPLATE_ID,
    );
    const hardwareProfile = getHardwareProfile(
      document.hardwareProfileId as typeof DEFAULT_HARDWARE_PROFILE_ID,
    );

    expect(document.templateId).toBe(DEFAULT_TEMPLATE_ID);
    expect(document.hardwareProfileId).toBe(DEFAULT_HARDWARE_PROFILE_ID);

    expect(template).toEqual({
      id: DEFAULT_TEMPLATE_ID,
      name: "Default Performance Instrument",
      hardwareProfileId: DEFAULT_HARDWARE_PROFILE_ID,
      trackCount: 8,
      pageKeys: ["sourceAmp", "filterMod", "fx"],
    });

    expect(hardwareProfile).toEqual({
      id: DEFAULT_HARDWARE_PROFILE_ID,
      name: "LaunchControl XL3 + Pi LCD",
      controller: "launchcontrolxl3",
      display: "pi-lcd",
      controllerPages: 3,
      slotsPerRow: 8,
    });
  });

  it("marks every default track as enabled", () => {
    const document = createDefaultInstrumentDocument();

    expect(document.tracks).toHaveLength(8);
    expect(document.tracks.every((track) => track.enabled)).toBe(true);
  });

  it("assigns eight voices to every default track", () => {
    const document = createDefaultInstrumentDocument();

    expect(document.tracks.every((track) => track.voices === 8)).toBe(true);
  });

  it("starts global delay and reverb sends dry", () => {
    const document = createDefaultInstrumentDocument();

    expect(document.globalBlock.delaySend).toBe(0);
    expect(document.globalBlock.reverbSend).toBe(0);
  });
});
