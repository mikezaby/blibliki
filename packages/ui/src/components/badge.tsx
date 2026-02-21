import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const badgeVariants = cva("ui-badge", {
  variants: {
    tone: {
      neutral: "ui-badge--tone-neutral",
      primary: "ui-badge--tone-primary",
      secondary: "ui-badge--tone-secondary",
      success: "ui-badge--tone-success",
      warning: "ui-badge--tone-warning",
      error: "ui-badge--tone-error",
      info: "ui-badge--tone-info",
    },
    variant: {
      soft: "ui-badge--variant-soft",
      solid: "ui-badge--variant-solid",
      outline: "ui-badge--variant-outline",
    },
    size: {
      sm: "ui-badge--size-sm",
      md: "ui-badge--size-md",
    },
  },
  defaultVariants: {
    tone: "neutral",
    variant: "soft",
    size: "md",
  },
});

type BadgeElement = HTMLSpanElement;

export interface BadgeProps
  extends HTMLAttributes<BadgeElement>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

const Badge = forwardRef<BadgeElement, BadgeProps>(
  ({ className, tone, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "span";

    return (
      <Comp
        ref={ref}
        className={cn(badgeVariants({ tone, variant, size }), className)}
        {...props}
      />
    );
  },
);

Badge.displayName = "Badge";

export { Badge, badgeVariants };
