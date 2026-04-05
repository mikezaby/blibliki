import type { Engine } from "@/Engine";
import type { PropSchema } from "@/core/schema";
import type { IMidiMapperProps, MidiMapping, MidiMappingMode } from ".";
import { moduleSchemas, ModuleType } from "..";

const DIRECT_REV_MODE = "directRev" as unknown as MidiMappingMode;

const clampMidi = (value: number) =>
  Math.round(Math.max(0, Math.min(127, value)));

export default class MidiMapperSyncValues {
  constructor(private readonly engine: Pick<Engine, "findModule">) {}

  collectCCValues(
    props: IMidiMapperProps,
    moduleId?: string,
  ): Map<number, number> {
    const activeTrack = props.tracks[props.activeTrack];
    const ccValues = new Map<number, number>();

    props.globalMappings.forEach((mapping) => {
      if (moduleId && moduleId !== mapping.moduleId) return;

      const value = this.getValue(mapping);
      if (mapping.cc === undefined || value === undefined) return;
      ccValues.set(mapping.cc, value);
    });

    activeTrack?.mappings.forEach((mapping) => {
      if (moduleId && moduleId !== mapping.moduleId) return;

      const value = this.getValue(mapping);
      if (mapping.cc === undefined || value === undefined) return;
      ccValues.set(mapping.cc, value);
    });

    return ccValues;
  }

  private getValue(mapping: MidiMapping<ModuleType>): number | undefined {
    if (
      mapping.moduleId === undefined ||
      mapping.moduleType === undefined ||
      mapping.propName === undefined
    ) {
      return;
    }

    let mappedModule: ReturnType<typeof this.engine.findModule>;
    try {
      mappedModule = this.engine.findModule(mapping.moduleId);
    } catch {
      return;
    }

    const propName = mapping.propName;
    const moduleSchema = moduleSchemas[mappedModule.moduleType] as Record<
      string,
      PropSchema
    >;
    const propSchema = moduleSchema[propName];
    if (!propSchema) return;

    const rawValue = (mappedModule.props as Record<string, unknown>)[propName];
    const mode = mapping.mode;

    switch (propSchema.kind) {
      case "number": {
        if (typeof rawValue !== "number") return;

        const { min, max } = propSchema;
        if (!Number.isFinite(min) || !Number.isFinite(max) || max === min) {
          return;
        }

        const normalizedValue = (rawValue - min) / (max - min);
        const clampedValue = Math.max(0, Math.min(1, normalizedValue));
        const exp = propSchema.exp ?? 1;
        let midiValue = Math.pow(clampedValue, 1 / exp) * 127;

        if (mode === DIRECT_REV_MODE) {
          midiValue = 127 - midiValue;
        }

        return clampMidi(midiValue);
      }
      case "enum": {
        const optionIndex = propSchema.options.findIndex(
          (option) => option === rawValue,
        );
        if (optionIndex < 0) return;

        if (propSchema.options.length <= 1) {
          return mode === DIRECT_REV_MODE ? 127 : 0;
        }

        const normalizedIndex = optionIndex / (propSchema.options.length - 1);
        let midiValue = normalizedIndex * 127;

        if (mode === DIRECT_REV_MODE) {
          midiValue = 127 - midiValue;
        }

        return clampMidi(midiValue);
      }
      case "boolean": {
        if (typeof rawValue !== "boolean") return;
        let midiValue = rawValue ? 127 : 0;

        if (mode === DIRECT_REV_MODE) {
          midiValue = 127 - midiValue;
        }

        return clampMidi(midiValue);
      }
      case "string":
      case "array":
        return;
      default:
        return;
    }
  }
}
