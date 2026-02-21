import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/cn";

const switchVariants = cva("ui-switch", {
  variants: {
    size: {
      sm: "ui-switch--size-sm",
      md: "ui-switch--size-md",
    },
    color: {
      primary: "ui-switch--color-primary",
      secondary: "ui-switch--color-secondary",
      error: "ui-switch--color-error",
      warning: "ui-switch--color-warning",
      info: "ui-switch--color-info",
      success: "ui-switch--color-success",
    },
  },
  defaultVariants: {
    size: "md",
    color: "primary",
  },
});

export interface SwitchProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "color" | "onChange">,
    VariantProps<typeof switchVariants> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      checked = false,
      onCheckedChange,
      className,
      size,
      color,
      type,
      onClick,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        role="switch"
        aria-checked={checked}
        data-state={checked ? "checked" : "unchecked"}
        className={cn(switchVariants({ size, color }), className)}
        onClick={(event) => {
          onClick?.(event);
          if (!event.defaultPrevented) {
            onCheckedChange?.(!checked);
          }
        }}
        {...props}
      >
        <span aria-hidden className="ui-switch__thumb" />
      </button>
    );
  },
);

Switch.displayName = "Switch";

export { Switch };
