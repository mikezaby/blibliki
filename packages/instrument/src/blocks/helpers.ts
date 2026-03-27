import { moduleSchemas, ModuleType, type PropSchema } from "@blibliki/engine";
import type {
  BaseSlot,
  ModulePropKey,
  SlotInitialValue,
} from "@/slots/BaseSlot";
import type { BlockKey, ValueSpec } from "@/types";

type CreateModulePropSlotParams<T extends ModuleType> = {
  key: string;
  label: string;
  shortLabel: string;
  moduleType: T;
  moduleId: string;
  propKey: ModulePropKey<T>;
  initialValue?: SlotInitialValue;
  inactive?: boolean;
};

export function createModuleId(blockKey: BlockKey, moduleName: string) {
  return `${blockKey}.${moduleName}`;
}

export function getValueSpecForModuleProp<T extends ModuleType>(
  moduleType: T,
  propKey: ModulePropKey<T>,
): ValueSpec {
  const schema = (moduleSchemas[moduleType] as Record<string, PropSchema>)[
    propKey
  ];

  if (!schema) {
    throw Error(`Prop schema ${propKey} not found for module ${moduleType}`);
  }

  switch (schema.kind) {
    case "number":
      return {
        kind: "number",
        min: schema.min,
        max: schema.max,
        step: schema.step,
      };
    case "enum":
      return {
        kind: "enum",
        options: schema.options,
      };
    case "boolean":
      return {
        kind: "boolean",
      };
    default:
      throw Error(
        `Unsupported prop schema kind ${(schema as { kind: string }).kind}`,
      );
  }
}

export function createModulePropSlot<T extends ModuleType>({
  key,
  label,
  shortLabel,
  moduleType,
  moduleId,
  propKey,
  initialValue,
  inactive,
}: CreateModulePropSlotParams<T>): BaseSlot<T> {
  return {
    key,
    label,
    shortLabel,
    binding: {
      kind: "module-prop",
      moduleType,
      moduleId,
      propKey,
    },
    valueSpec: getValueSpecForModuleProp(moduleType, propKey),
    initialValue,
    inactive,
  };
}
