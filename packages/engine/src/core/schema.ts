import { EmptyObject } from "@blibliki/utils";

type BasePropType = {
  label?: string;
  description?: string;
};

export type NumberProp = BasePropType & {
  kind: "number";
  min?: number;
  max?: number;
  step?: number;
};

export type EnumProp<T extends string | number> = BasePropType & {
  kind: "enum";
  options: T[];
};

export type StringProp = BasePropType & {
  kind: "string";
  pattern?: RegExp;
};

export type BooleanProp = BasePropType & {
  kind: "boolean";
};

export type ArrayProp = BasePropType & {
  kind: "array";
};

// Union of all possible prop schema types
export type PropSchema =
  | NumberProp
  | EnumProp<string>
  | EnumProp<number>
  | StringProp
  | BooleanProp
  | ArrayProp;

// Utility type to map TypeScript types to their primary schema types
type PrimarySchemaForType<T> = T extends boolean
  ? BooleanProp
  : T extends string
    ? StringProp
    : T extends number
      ? NumberProp
      : T extends unknown[]
        ? ArrayProp
        : never;

/**
 * Schema type that maps each property to its primary schema type, with optional overrides.
 * This provides excellent IntelliSense for both simple and complex cases.
 *
 * Basic usage:
 * ```typescript
 * type MyProps = { count: number; name: string; enabled: boolean };
 * const mySchema: ModulePropSchema<MyProps> = {
 *   count: { kind: "number", min: 0, max: 100 },
 *   name: { kind: "string" },
 *   enabled: { kind: "boolean" }
 * };
 * ```
 *
 * With overrides for custom schema types:
 * ```typescript
 * type MyProps = { wave: OscillatorWave; frequency: number };
 * const mySchema: ModulePropSchema<MyProps, {
 *   wave: EnumProp<OscillatorWave>
 * }> = {
 *   wave: { kind: "enum", options: Object.values(OscillatorWave) },
 *   frequency: { kind: "number", min: 0, max: 1000 }
 * };
 * ```
 */
export type ModulePropSchema<
  T,
  TOverrides extends Partial<Record<keyof T, PropSchema>> = EmptyObject,
> = {
  [K in keyof T]: K extends keyof TOverrides
    ? TOverrides[K]
    : PrimarySchemaForType<T[K]>;
};
