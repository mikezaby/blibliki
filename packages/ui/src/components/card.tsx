import { type ComponentProps, forwardRef } from "react";
import { cn } from "@/lib/cn";

const Card = forwardRef<HTMLDivElement, ComponentProps<"div">>(
  ({ className, ...props }, ref) => {
    return <div ref={ref} className={cn("ui-card", className)} {...props} />;
  },
);

Card.displayName = "Card";

function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("ui-card-header", className)} {...props} />;
}

function CardTitle({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("ui-card-title", className)} {...props} />;
}

function CardDescription({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("ui-card-description", className)} {...props} />;
}

function CardAction({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("ui-card-action", className)} {...props} />;
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("ui-card-content", className)} {...props} />;
}

function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("ui-card-footer", className)} {...props} />;
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
