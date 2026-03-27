import { ModuleType, ModuleTypeToPropsMapping } from "@blibliki/engine";
import type { ValueSpec } from "@/types";

export type ModulePropKey<T extends ModuleType> = T extends ModuleType
  ? keyof ModuleTypeToPropsMapping[T] & string
  : never;

export type SlotBinding<T extends ModuleType = ModuleType> = {
  kind: "module-prop";
  moduleId: string;
  moduleType: T;
  propKey: ModulePropKey<T>;
};

export type SlotInitialValue = number | string | boolean;

export type BaseSlot<T extends ModuleType = ModuleType> = {
  key: string;
  label: string;
  shortLabel: string;
  binding: SlotBinding<T>;
  valueSpec: ValueSpec;
  initialValue?: SlotInitialValue;
  inactive?: boolean;
};

export type AnySlotBinding = {
  [K in ModuleType]: SlotBinding<K>;
}[ModuleType];

export type AnyBaseSlot = {
  [K in ModuleType]: BaseSlot<K>;
}[ModuleType];
