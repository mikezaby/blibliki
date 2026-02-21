import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const textVariants = cva("ui-text", {
  variants: {
    tone: {
      primary: "ui-text--tone-primary",
      secondary: "ui-text--tone-secondary",
      muted: "ui-text--tone-muted",
      success: "ui-text--tone-success",
      warning: "ui-text--tone-warning",
      error: "ui-text--tone-error",
      info: "ui-text--tone-info",
    },
    size: {
      xs: "ui-text--size-xs",
      sm: "ui-text--size-sm",
      md: "ui-text--size-md",
      lg: "ui-text--size-lg",
    },
    weight: {
      regular: "ui-text--weight-regular",
      medium: "ui-text--weight-medium",
      semibold: "ui-text--weight-semibold",
    },
  },
  defaultVariants: {
    tone: "primary",
    size: "sm",
    weight: "regular",
  },
});

type TextElement = HTMLParagraphElement;

export interface TextProps
  extends HTMLAttributes<TextElement>, VariantProps<typeof textVariants> {
  asChild?: boolean;
}

const Text = forwardRef<TextElement, TextProps>(
  ({ className, tone, size, weight, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "p";

    return (
      <Comp
        ref={ref}
        className={cn(textVariants({ tone, size, weight }), className)}
        {...props}
      />
    );
  },
);

Text.displayName = "Text";

export { Text, textVariants };
