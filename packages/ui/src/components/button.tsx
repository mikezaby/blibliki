import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/cn";

const buttonVariants = cva("ui-button", {
  variants: {
    variant: {
      contained: "ui-button--variant-contained",
      outlined: "ui-button--variant-outlined",
      text: "ui-button--variant-text",
    },
    color: {
      primary: "ui-button--color-primary",
      secondary: "ui-button--color-secondary",
      error: "ui-button--color-error",
      warning: "ui-button--color-warning",
      info: "ui-button--color-info",
      success: "ui-button--color-success",
    },
    size: {
      md: "ui-button--size-md",
      sm: "ui-button--size-sm",
      lg: "ui-button--size-lg",
      icon: "ui-button--size-icon",
    },
  },
  defaultVariants: {
    variant: "contained",
    color: "primary",
    size: "md",
  },
});

type ButtonElement = HTMLButtonElement;

export interface ButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<ButtonElement>, "color">,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<ButtonElement, ButtonProps>(
  (
    { className, variant, color, size, asChild = false, type, ...props },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, color, size }), className)}
        type={asChild ? undefined : (type ?? "button")}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button, buttonVariants };
