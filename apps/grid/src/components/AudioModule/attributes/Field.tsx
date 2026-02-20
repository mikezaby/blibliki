import {
  BooleanProp,
  EnumProp,
  NumberProp,
  PropSchema,
  StringProp,
} from "@blibliki/engine";
import {
  Input,
  Label,
  OptionSelect,
  Stack,
  Surface,
  Switch,
} from "@blibliki/ui";
import { ChangeEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldProps<T extends string | number | boolean | string[] | number[]> = {
  name: string;
  value?: T;
  schema: PropSchema;
  onChange: (value: T) => void;
  className?: string;
};

type InputProps<T extends string | number> = FieldProps<T> & {
  schema: NumberProp | StringProp;
};

function FieldShell({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Surface
      tone="subtle"
      border="subtle"
      radius="md"
      className={cn("p-3", className)}
    >
      <Stack gap={3}>
        <Stack direction="row" align="center" gap={2}>
          <div className="h-2 w-2 rounded-full bg-gradient-to-br from-brand to-brand-secondary" />
          <Label className="text-xs font-semibold tracking-tight">
            {label}
          </Label>
        </Stack>
        {children}
      </Stack>
    </Surface>
  );
}

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
    <FieldShell label={label} className={className}>
      <Input
        type={inputType}
        value={value}
        onChange={internalOnChange}
        className={
          inputType === "number" ? "w-20 text-center font-mono" : undefined
        }
      />
    </FieldShell>
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
    <FieldShell label={label} className={className}>
      <OptionSelect
        label={""}
        value={value!}
        options={schema.options}
        onChange={onChange}
        triggerClassName="w-full"
        contentClassName="text-sm"
      />
    </FieldShell>
  );
};

type CheckboxProps = FieldProps<boolean> & {
  schema: BooleanProp;
};

export const CheckboxField = ({
  name,
  value,
  schema,
  onChange,
  className,
}: CheckboxProps) => {
  const label = schema.label ?? name;

  return (
    <FieldShell label={label} className={className}>
      <Switch
        checked={Boolean(value)}
        color="success"
        onCheckedChange={(checked: boolean) => {
          onChange(checked);
        }}
      />
    </FieldShell>
  );
};
