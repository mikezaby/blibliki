import { Stack } from "@blibliki/ui";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_CLASS_NAMES = "gap-x-8";

export default function Container({
  children,
  className = "",
  direction = "row",
}: {
  children: ReactNode;
  className?: string;
  direction?: "row" | "column";
}) {
  return (
    <Stack
      direction={direction}
      align="stretch"
      justify="around"
      gap={0}
      className={cn(DEFAULT_CLASS_NAMES, className)}
    >
      {children}
    </Stack>
  );
}
