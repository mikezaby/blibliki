import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/cn";

const dividerVariants = cva("ui-divider", {
  variants: {
    orientation: {
      horizontal: "ui-divider--horizontal",
      vertical: "ui-divider--vertical",
    },
    tone: {
      subtle: "ui-divider--tone-subtle",
      strong: "ui-divider--tone-strong",
    },
  },
  defaultVariants: {
    orientation: "horizontal",
    tone: "subtle",
  },
});

type DividerElement = HTMLDivElement;

export interface DividerProps
  extends
    React.HTMLAttributes<DividerElement>,
    VariantProps<typeof dividerVariants> {}

const Divider = React.forwardRef<DividerElement, DividerProps>(
  ({ className, orientation, tone, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="separator"
        aria-orientation={orientation ?? "horizontal"}
        className={cn(dividerVariants({ orientation, tone }), className)}
        {...props}
      />
    );
  },
);

Divider.displayName = "Divider";

export { Divider, dividerVariants };
