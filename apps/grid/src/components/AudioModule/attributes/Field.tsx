import {
  BooleanProp,
  EnumProp,
  NumberProp,
  PropSchema,
  StringProp,
} from "@blibliki/engine";
import {
  Input,
  Encoder,
  Label,
  OptionSelect,
  Stack,
  Surface,
  Switch,
} from "@blibliki/ui";
import { ChangeEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldProps<T extends string | number | boolean | string[] | number[]> = {
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
  value,
  schema,
  onChange,
  className,
}: InputProps<T>) => {
  const label = schema.label;

  if (schema.kind === "number") {
    return (
      <FieldShell label={label} className={className}>
        <div className="flex justify-center">
          <Encoder
            name={label}
            min={schema.min}
            max={schema.max}
            step={schema.step}
            exp={schema.exp}
            value={value as number | undefined}
            onChange={(newValue) => {
              onChange(newValue as T);
            }}
          />
        </div>
      </FieldShell>
    );
  }

  const inputType = "text";

  const internalOnChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value as T);
  };

  return (
    <FieldShell label={label} className={className}>
      <Input type={inputType} value={value} onChange={internalOnChange} />
    </FieldShell>
  );
};

type SelectProps<T extends string | number> = FieldProps<T> & {
  schema: EnumProp<T>;
};

export const SelectField = <T extends string | number>({
  value,
  schema,
  onChange,
  className,
}: SelectProps<T>) => {
  const label = schema.label;

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
  value,
  schema,
  onChange,
  className,
}: CheckboxProps) => {
  const label = schema.label;

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
