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

export type PropDefinition<T> = T extends number
  ? NumberProp | EnumProp<number>
  : T extends boolean
    ? BooleanProp
    : T extends string
      ? StringProp | EnumProp<string>
      : T extends (string | number)[]
        ? ArrayProp
        : never;

export type PropSchema<T> = { [K in keyof T]: PropDefinition<T[K]> };
