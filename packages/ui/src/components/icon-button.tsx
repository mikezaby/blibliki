import * as React from "react";
import { cn } from "@/lib/cn";
import { Button, type ButtonProps } from "./button";

type IconButtonSize = "xs" | "sm" | "md";

const sizeClass: Record<IconButtonSize, string> = {
  xs: "ui-icon-button--size-xs",
  sm: "ui-icon-button--size-sm",
  md: "ui-icon-button--size-md",
};

export interface IconButtonProps extends Omit<
  ButtonProps,
  "children" | "size" | "asChild"
> {
  icon: React.ReactNode;
  size?: IconButtonSize;
  "aria-label": string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      size = "md",
      variant = "text",
      color = "secondary",
      className,
      ...props
    },
    ref,
  ) => {
    return (
      <Button
        ref={ref}
        variant={variant}
        color={color}
        size="icon"
        className={cn("ui-icon-button", sizeClass[size], className)}
        {...props}
      >
        {icon}
      </Button>
    );
  },
);

IconButton.displayName = "IconButton";

export { IconButton };
