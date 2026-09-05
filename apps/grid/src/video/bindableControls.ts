import { moduleSchemas, ModuleType, type PropSchema } from "@blibliki/engine";

export type BindableControl = {
  control: string;
  label: string;
  group: "Spectrum" | "Audio";
  min: number;
  max: number;
  exp?: number;
};

type ModuleInfo = { id: string; name: string; moduleType: ModuleType };

const BANDS = ["low", "mid", "high", "level"] as const;

export function bindableControls(modules: ModuleInfo[]): BindableControl[] {
  const controls: BindableControl[] = [];

  for (const module of modules) {
    if (module.moduleType === ModuleType.Spectrum) {
      for (const band of BANDS) {
        controls.push({
          control: `spectrum:${module.id}:${band}`,
          label: `${module.name} · ${band}`,
          group: "Spectrum",
          min: 0,
          max: 1,
        });
      }
    }

    const schema = moduleSchemas[module.moduleType] as
      Record<string, PropSchema> | undefined;
    if (!schema) continue;
    for (const [prop, propSchema] of Object.entries(schema)) {
      if (propSchema.kind !== "number") continue;
      if (!Number.isFinite(propSchema.min) || !Number.isFinite(propSchema.max))
        continue;
      controls.push({
        control: `patch:${module.id}:${prop}`,
        label: `${module.name} · ${propSchema.label}`,
        group: "Audio",
        min: propSchema.min,
        max: propSchema.max,
        exp: propSchema.exp,
      });
    }
  }

  return controls;
}

export function controlLabel(
  controls: BindableControl[],
  control: string,
): string {
  return controls.find((c) => c.control === control)?.label ?? control;
}
