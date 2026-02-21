import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const textareaVariants = cva("ui-textarea", {
  variants: {
    size: {
      sm: "ui-textarea--size-sm",
      md: "ui-textarea--size-md",
    },
    resize: {
      none: "ui-textarea--resize-none",
      vertical: "ui-textarea--resize-vertical",
      both: "ui-textarea--resize-both",
    },
  },
  defaultVariants: {
    size: "md",
    resize: "vertical",
  },
});

export interface TextareaProps
  extends
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "size">,
    VariantProps<typeof textareaVariants> {}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, size, resize, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        data-size={size ?? "md"}
        className={cn(textareaVariants({ size, resize }), className)}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

export { Textarea, textareaVariants };
