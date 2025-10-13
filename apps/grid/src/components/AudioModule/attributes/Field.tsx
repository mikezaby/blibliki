import {
  EnumProp,
  NumberProp,
  PropDefinition,
  StringProp,
} from "@blibliki/engine";
import { Label } from "@radix-ui/react-label";
import { ChangeEvent } from "react";
import Select from "@/components/Select";
import { Input } from "@/components/ui";
import { cn } from "@/lib/utils";

type FieldProps<T extends string | number | boolean | (string | number)[]> = {
  name: string;
  value?: T;
  schema: PropDefinition<T>;
  onChange: (value: T) => void;
  className?: string;
};

type InputProps<T extends string | number> = FieldProps<T> & {
  schema: NumberProp | StringProp;
};

export const InputField = <T extends string | number>({
  name,
  value,
  schema,
  onChange,
  className,
}: InputProps<T>) => {
  const label = schema.label ?? name;
  const inputType = schema.kind === "string" ? "text" : "number";

  const internalOnChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newValue =
      schema.kind === "string"
        ? event.target.value
        : Number(event.target.value);

    onChange(newValue as T);
  };

  return (
    <div className={cn("flex flex-col justify-center items-center", className)}>
      <Label>{label}</Label>
      <Input type={inputType} value={value} onChange={internalOnChange} />
    </div>
  );
};

type SelectProps<T extends string | number> = FieldProps<T> & {
  schema: EnumProp<T>;
};

export const SelectField = <T extends string | number>({
  name,
  value,
  schema,
  onChange,
  className,
}: SelectProps<T>) => {
  const label = schema.label ?? name;

  return (
    <Select
      label={label}
      value={value!}
      options={schema.options}
      onChange={onChange}
      className={className}
    />
  );
};
