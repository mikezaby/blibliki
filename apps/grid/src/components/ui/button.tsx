import {
  Button as ChakraButton,
  type ButtonProps as ChakraButtonProps,
} from "@chakra-ui/react";
import { cn } from "@/lib/utils";

type LegacyButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

type LegacyButtonSize = "default" | "sm" | "lg" | "icon";

const VARIANT_MAP: Record<
  LegacyButtonVariant,
  Pick<ChakraButtonProps, "variant" | "colorPalette">
> = {
  default: { variant: "solid", colorPalette: "brand" },
  destructive: { variant: "solid", colorPalette: "red" },
  outline: { variant: "outline", colorPalette: "gray" },
  secondary: { variant: "subtle", colorPalette: "gray" },
  ghost: { variant: "ghost", colorPalette: "gray" },
  link: { variant: "plain", colorPalette: "gray" },
};

const SIZE_MAP: Record<
  LegacyButtonSize,
  Pick<ChakraButtonProps, "size"> & {
    minW?: ChakraButtonProps["minW"];
    h?: ChakraButtonProps["h"];
    p?: ChakraButtonProps["p"];
  }
> = {
  default: { size: "sm" },
  sm: { size: "xs" },
  lg: { size: "md" },
  icon: { size: "sm", minW: "2.25rem", h: "2.25rem", p: 0 },
};

type ButtonVariantsArgs = {
  className?: string;
  variant?: LegacyButtonVariant;
  size?: LegacyButtonSize;
};

/**
 * Legacy helper kept for compatibility during migration.
 * New code should prefer Chakra props directly on `Button`.
 */
const buttonVariants = ({ className = "" }: ButtonVariantsArgs = {}) =>
  cn(className);

type ButtonProps = Omit<
  ChakraButtonProps,
  "variant" | "size" | "colorPalette"
> &
  ButtonVariantsArgs &
  Record<string, unknown>;

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonProps) {
  const variantProps = VARIANT_MAP[variant];
  const sizeProps = SIZE_MAP[size];

  return (
    <ChakraButton
      data-slot="button"
      className={cn(className)}
      {...variantProps}
      {...sizeProps}
      {...props}
    />
  );
}

export { Button, buttonVariants };
