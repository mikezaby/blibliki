import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/cn";

const surfaceVariants = cva("ui-surface", {
  variants: {
    tone: {
      canvas: "ui-surface--tone-canvas",
      panel: "ui-surface--tone-panel",
      raised: "ui-surface--tone-raised",
      subtle: "ui-surface--tone-subtle",
    },
    border: {
      none: "",
      subtle: "ui-surface--border-subtle",
    },
    radius: {
      none: "ui-surface--radius-none",
      sm: "ui-surface--radius-sm",
      md: "ui-surface--radius-md",
      lg: "ui-surface--radius-lg",
    },
    shadow: {
      none: "",
      sm: "ui-surface--shadow-sm",
      md: "ui-surface--shadow-md",
      lg: "ui-surface--shadow-lg",
      xl: "ui-surface--shadow-xl",
    },
    intent: {
      neutral: "",
      success: "ui-surface--intent-success",
      warning: "ui-surface--intent-warning",
      error: "ui-surface--intent-error",
      info: "ui-surface--intent-info",
    },
  },
  defaultVariants: {
    tone: "raised",
    border: "none",
    radius: "md",
    shadow: "none",
    intent: "neutral",
  },
});

type SurfaceElement = HTMLDivElement;

export interface SurfaceProps
  extends
    React.HTMLAttributes<SurfaceElement>,
    VariantProps<typeof surfaceVariants> {
  asChild?: boolean;
}

const Surface = React.forwardRef<SurfaceElement, SurfaceProps>(
  (
    {
      className,
      tone,
      border,
      radius,
      shadow,
      intent,
      asChild = false,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "div";

    return (
      <Comp
        ref={ref}
        className={cn(
          surfaceVariants({ tone, border, radius, shadow, intent }),
          className,
        )}
        {...props}
      />
    );
  },
);

Surface.displayName = "Surface";

export { Surface, surfaceVariants };
