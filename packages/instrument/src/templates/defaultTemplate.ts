import { DEFAULT_HARDWARE_PROFILE_ID } from "@/profiles/hardwareProfile";

export const DEFAULT_TEMPLATE_ID = "default-performance-instrument" as const;

export type TemplateId = typeof DEFAULT_TEMPLATE_ID;

export type InstrumentTemplate = {
  id: TemplateId;
  name: string;
  hardwareProfileId: typeof DEFAULT_HARDWARE_PROFILE_ID;
  trackCount: 8;
  pageKeys: ["sourceAmp", "filterMod", "fx"];
};

export const defaultTemplate: InstrumentTemplate = {
  id: DEFAULT_TEMPLATE_ID,
  name: "Default Performance Instrument",
  hardwareProfileId: DEFAULT_HARDWARE_PROFILE_ID,
  trackCount: 8,
  pageKeys: ["sourceAmp", "filterMod", "fx"],
};

export const templates: Record<TemplateId, InstrumentTemplate> = {
  [DEFAULT_TEMPLATE_ID]: defaultTemplate,
};

export function getTemplate(templateId: TemplateId): InstrumentTemplate {
  return templates[templateId];
}
