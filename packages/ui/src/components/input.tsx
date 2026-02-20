import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const inputVariants = cva("ui-input", {
  variants: {
    size: {
      sm: "ui-input--size-sm",
      md: "ui-input--size-md",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

export interface InputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", size, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        data-size={size ?? "md"}
        className={cn(inputVariants({ size }), className)}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input, inputVariants };
