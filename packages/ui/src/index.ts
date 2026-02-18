export { Button, buttonVariants, type ButtonProps } from "./components/button";
export {
  Surface,
  surfaceVariants,
  type SurfaceProps,
} from "./components/surface";
export { Stack, stackVariants, type StackProps } from "./components/stack";
export {
  Divider,
  dividerVariants,
  type DividerProps,
} from "./components/divider";
export { IconButton, type IconButtonProps } from "./components/icon-button";
export { Switch, type SwitchProps } from "./components/switch";
export { UIProvider, type UIProviderProps } from "./UIProvider";
export { cn } from "./lib/cn";
export {
  createTheme,
  themeToCssVariables,
  type UIMode,
  type UIResolvedTheme,
  type UITheme,
  type UIColorTokens,
  type UIRadiusTokens,
} from "./theme";

export const UI_MAX_TAILWIND_CLASSES = 12;
