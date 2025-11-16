import { useMemo } from "react";
import {
  Select as SelectUI,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui";

type TOption = string[] | number[] | TDefOption[] | TIDOption[];

type TDefOption = { name: string; value: string | number };
type TIDOption = { id: string; name: string };

type SelectProps<T extends string | number | undefined> = {
  value: T;
  options: TOption;
  label?: string;
  className?: string;
  disabled?: boolean;
  onChange: (value: T) => void;
};

export default function Select<T extends string | number | undefined>(
  props: SelectProps<T>,
) {
  const {
    value,
    options,
    label,
    onChange,
    className = "",
    disabled = false,
  } = props;

  const opts: TDefOption[] = useMemo(() => {
    if (!options.length) return options as TDefOption[];

    if (options[0] instanceof Object) {
      if ("value" in options[0]) return options as TDefOption[];

      return (options as TIDOption[]).map((opt) => ({
        name: opt.name,
        value: opt.id,
      }));
    } else {
      return (options as string[]).map((opt) => ({
        name: opt,
        value: opt,
      }));
    }
  }, [options]);

  const onValueChange = (newValue: string | undefined) => {
    if (typeof value === "number") {
      onChange(Number(newValue) as T);
    } else {
      onChange(newValue as T);
    }
  };

  return (
    <SelectUI
      value={value?.toString()}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder={label} />
      </SelectTrigger>

      <SelectContent className={className}>
        <SelectGroup>
          <SelectLabel>Select...</SelectLabel>
          {opts.map(({ name, value: v }) => (
            <SelectItem key={v} value={v.toString()}>
              {name} ({v})
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </SelectUI>
  );
}
