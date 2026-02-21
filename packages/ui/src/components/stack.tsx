import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import * as React from "react";
import { cn } from "@/lib/cn";

const stackVariants = cva("ui-stack", {
  variants: {
    direction: {
      row: "ui-stack--row",
      column: "ui-stack--column",
    },
    align: {
      start: "ui-stack--align-start",
      center: "ui-stack--align-center",
      end: "ui-stack--align-end",
      stretch: "ui-stack--align-stretch",
      baseline: "ui-stack--align-baseline",
    },
    justify: {
      start: "ui-stack--justify-start",
      center: "ui-stack--justify-center",
      end: "ui-stack--justify-end",
      between: "ui-stack--justify-between",
      around: "ui-stack--justify-around",
      evenly: "ui-stack--justify-evenly",
    },
    gap: {
      0: "ui-stack--gap-0",
      1: "ui-stack--gap-1",
      2: "ui-stack--gap-2",
      3: "ui-stack--gap-3",
      4: "ui-stack--gap-4",
      5: "ui-stack--gap-5",
      6: "ui-stack--gap-6",
    },
    wrap: {
      true: "ui-stack--wrap",
      false: "",
    },
  },
  defaultVariants: {
    direction: "column",
    align: "stretch",
    justify: "start",
    gap: 2,
    wrap: false,
  },
});

type StackElement = HTMLDivElement;

export interface StackProps
  extends
    React.HTMLAttributes<StackElement>,
    VariantProps<typeof stackVariants> {
  asChild?: boolean;
}

const Stack = React.forwardRef<StackElement, StackProps>(
  (
    {
      className,
      direction,
      align,
      justify,
      gap,
      wrap,
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
          stackVariants({ direction, align, justify, gap, wrap }),
          className,
        )}
        {...props}
      />
    );
  },
);

Stack.displayName = "Stack";

export { Stack, stackVariants };
