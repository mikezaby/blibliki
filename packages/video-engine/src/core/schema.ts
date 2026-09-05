import { EmptyObject } from "@blibliki/utils";

type BasePropType = {
  label: string;
  shortLabel: string;
  description?: string;
};

export type NumberProp = BasePropType & {
  kind: "number";
  min: number;
  max: number;
  step?: number;
  exp?: number;
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

export type PropSchema =
  | NumberProp
  | EnumProp<string>
  | EnumProp<number>
  | StringProp
  | BooleanProp
  | ArrayProp;

type PrimarySchemaForType<T> = T extends boolean
  ? BooleanProp
  : T extends string
    ? StringProp
    : T extends number
      ? NumberProp
      : T extends unknown[]
        ? ArrayProp
        : never;

export type ModulePropSchema<
  T,
  TOverrides extends Partial<Record<keyof T, PropSchema>> = EmptyObject,
> = {
  [K in keyof T]: K extends keyof TOverrides
    ? TOverrides[K]
    : PrimarySchemaForType<T[K]>;
};
