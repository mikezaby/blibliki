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
export {
  OptionSelect,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
  type OptionSelectProps,
} from "./components/select";
export {
  Fader,
  type FaderProps,
  type MarkProps,
  type TOrientation,
} from "./components/fader";
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  type DialogContentProps,
} from "./components/dialog";
export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "./components/dropdown-menu";
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
