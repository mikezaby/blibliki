import * as SelectPrimitive from "@radix-ui/react-select";
import type { ComponentProps } from "react";
import { useMemo } from "react";
import { cn } from "@/lib/cn";

function SelectChevronDownIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden {...props}>
      <path
        d="M4 6.5 8 10.5 12 6.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SelectChevronUpIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden {...props}>
      <path
        d="M4 9.5 8 5.5 12 9.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SelectCheckIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden {...props}>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Select(props: ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root {...props} />;
}

function SelectGroup(props: ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group {...props} />;
}

function SelectValue({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Value>) {
  return (
    <SelectPrimitive.Value
      className={cn("ui-select-value", className)}
      {...props}
    />
  );
}

function SelectTrigger({
  className,
  size = "md",
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "sm" | "md";
}) {
  return (
    <SelectPrimitive.Trigger
      data-size={size}
      className={cn("ui-select-trigger", className)}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <SelectChevronDownIcon className="ui-select-chevron" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        className={cn(
          "ui-select-content",
          position === "popper" && "ui-select-content--popper",
          className,
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport
          className={cn(
            "ui-select-viewport",
            position === "popper" && "ui-select-viewport--popper",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      className={cn("ui-select-label", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn("ui-select-item", className)}
      {...props}
    >
      <span className="ui-select-indicator" aria-hidden>
        <SelectPrimitive.ItemIndicator>
          <SelectCheckIcon className="ui-select-indicator-icon" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText className="ui-select-item-text">
        {children}
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      className={cn("ui-select-separator", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      className={cn("ui-select-scroll-button", className)}
      {...props}
    >
      <SelectChevronUpIcon className="ui-select-scroll-icon" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      className={cn("ui-select-scroll-button", className)}
      {...props}
    >
      <SelectChevronDownIcon className="ui-select-scroll-icon" />
    </SelectPrimitive.ScrollDownButton>
  );
}

type OptionSelectValue = string | number;
type OptionSelectValueOption = { name: string; value: OptionSelectValue };
type OptionSelectIdOption = { id: string; name: string };
type OptionSelectInput =
  | readonly string[]
  | readonly number[]
  | readonly OptionSelectValueOption[]
  | readonly OptionSelectIdOption[];

export interface OptionSelectProps<T extends OptionSelectValue | undefined> {
  value: T;
  options: OptionSelectInput;
  label?: string;
  contentClassName?: string;
  triggerClassName?: string;
  disabled?: boolean;
  onChange: (value: T) => void;
}

function isValueOption(value: unknown): value is OptionSelectValueOption {
  return Boolean(
    value &&
    typeof value === "object" &&
    "name" in value &&
    "value" in value &&
    (typeof (value as { value: unknown }).value === "string" ||
      typeof (value as { value: unknown }).value === "number"),
  );
}

function isIdOption(value: unknown): value is OptionSelectIdOption {
  return Boolean(
    value &&
    typeof value === "object" &&
    "id" in value &&
    "name" in value &&
    typeof (value as { id: unknown }).id === "string",
  );
}

function OptionSelect<T extends OptionSelectValue | undefined>({
  value,
  options,
  label,
  contentClassName,
  triggerClassName,
  disabled = false,
  onChange,
}: OptionSelectProps<T>) {
  const normalizedOptions = useMemo(() => {
    if (!options.length) return [];

    const first = options[0];
    if (typeof first === "string" || typeof first === "number") {
      return (options as readonly OptionSelectValue[]).map((option) => ({
        name: option.toString(),
        value: option,
      }));
    }

    if (isValueOption(first)) {
      return Array.from(options as readonly OptionSelectValueOption[]);
    }

    if (isIdOption(first)) {
      return (options as readonly OptionSelectIdOption[]).map((option) => ({
        name: option.name,
        value: option.id,
      }));
    }

    return [];
  }, [options]);

  const valueKind = useMemo<"number" | "string">(() => {
    if (!normalizedOptions.length) {
      return typeof value === "number" ? "number" : "string";
    }
    return typeof normalizedOptions[0]?.value === "number"
      ? "number"
      : "string";
  }, [normalizedOptions, value]);

  const onValueChange = (newValue: string) => {
    if (valueKind === "number") {
      onChange(Number(newValue) as T);
      return;
    }
    onChange(newValue as T);
  };

  const selectedValue =
    value !== undefined && value !== "" ? value.toString() : undefined;
  const placeholder = label && label.length > 0 ? label : "Select...";
  const longestDisplayLength = useMemo(() => {
    const longestOption = normalizedOptions.reduce((maxLength, option) => {
      const length = option.name.length;
      return Math.max(maxLength, length);
    }, 0);

    return Math.max(placeholder.length, longestOption);
  }, [normalizedOptions, placeholder]);
  const autoWidthCh = Math.min(Math.max(longestDisplayLength + 6, 18), 40);

  const triggerStyle = triggerClassName
    ? undefined
    : ({
        width: `clamp(10rem, ${autoWidthCh}ch, 26rem)`,
        maxWidth: "100%",
      } as const);

  return (
    <Select
      value={selectedValue}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectTrigger className={triggerClassName} style={triggerStyle}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        <SelectGroup>
          <SelectLabel>Select...</SelectLabel>
          {normalizedOptions.map((option) => (
            <SelectItem key={option.value} value={option.value.toString()}>
              {option.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export {
  OptionSelect,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
