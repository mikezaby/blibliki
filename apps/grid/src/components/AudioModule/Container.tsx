import { ReactNode } from "react";

const DEFAULT_CLASS_NAMES = "flex justify-around gap-x-8";

export default function Container({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${DEFAULT_CLASS_NAMES} ${className}`}>{children}</div>
  );
}
