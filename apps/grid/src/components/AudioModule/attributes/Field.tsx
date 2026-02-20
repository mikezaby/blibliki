import {
  BooleanProp,
  EnumProp,
  NumberProp,
  PropSchema,
  StringProp,
} from "@blibliki/engine";
import { OptionSelect, Switch } from "@blibliki/ui";
import { Label } from "@radix-ui/react-label";
import { ChangeEvent } from "react";
import { Input } from "@/components/ui";
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
    <div
      className={cn(
        "space-y-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full" />
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight">
          {label}
        </Label>
      </div>
      <Input
        type={inputType}
        value={value}
        onChange={internalOnChange}
        className={`text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors ${
          inputType === "number" ? "w-20 text-center font-mono" : ""
        }`}
      />
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
    <div
      className={cn(
        "space-y-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full" />
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight">
          {label}
        </Label>
      </div>
      <OptionSelect
        label={""}
        value={value!}
        options={schema.options}
        onChange={onChange}
        triggerClassName="w-full"
        contentClassName="text-sm"
      />
    </div>
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
    <div
      className={cn(
        "space-y-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full" />
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight">
          {label}
        </Label>
      </div>
      <Switch
        checked={Boolean(value)}
        color="success"
        onCheckedChange={(checked: boolean) => {
          onChange(checked);
        }}
      />
    </div>
  );
};
