import * as React from "react";
import { cn } from "@/lib/cn";
import {
  createTheme,
  type UIMode,
  type UITheme,
  themeToCssVariables,
} from "@/theme";

export interface UIProviderProps {
  children: React.ReactNode;
  mode?: UIMode;
  theme?: UITheme;
  className?: string;
}

export function UIProvider({
  children,
  mode = "light",
  theme,
  className,
}: UIProviderProps): React.JSX.Element {
  const resolvedTheme = React.useMemo(() => createTheme(theme), [theme]);
  const variables = React.useMemo(
    () => themeToCssVariables(resolvedTheme, mode),
    [resolvedTheme, mode],
  );

  return (
    <div
      className={cn(mode === "dark" && "dark", className)}
      data-theme={mode}
      style={variables as React.CSSProperties}
    >
      {children}
    </div>
  );
}
