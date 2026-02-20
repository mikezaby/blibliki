import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

function MenuCheckIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden {...props}>
      <path
        d="M3.5 8.5 6.5 11.5 12.5 4.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuDotIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden {...props}>
      <circle cx="8" cy="8" r="3" />
    </svg>
  );
}

function MenuChevronRightIcon(props: ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden {...props}>
      <path
        d="M6 3.5 10.5 8 6 12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ContextMenu(props: ComponentProps<typeof ContextMenuPrimitive.Root>) {
  return <ContextMenuPrimitive.Root {...props} />;
}

function ContextMenuTrigger(
  props: ComponentProps<typeof ContextMenuPrimitive.Trigger>,
) {
  return <ContextMenuPrimitive.Trigger {...props} />;
}

function ContextMenuGroup(props: ComponentProps<typeof ContextMenuPrimitive.Group>) {
  return <ContextMenuPrimitive.Group {...props} />;
}

function ContextMenuPortal(
  props: ComponentProps<typeof ContextMenuPrimitive.Portal>,
) {
  return <ContextMenuPrimitive.Portal {...props} />;
}

function ContextMenuSub(props: ComponentProps<typeof ContextMenuPrimitive.Sub>) {
  return <ContextMenuPrimitive.Sub {...props} />;
}

function ContextMenuRadioGroup(
  props: ComponentProps<typeof ContextMenuPrimitive.RadioGroup>,
) {
  return <ContextMenuPrimitive.RadioGroup {...props} />;
}

function ContextMenuSubTrigger({
  className,
  inset = false,
  children,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.SubTrigger
      data-inset={inset ? "true" : undefined}
      className={cn("ui-dropdown-item ui-dropdown-sub-trigger", className)}
      {...props}
    >
      {children}
      <MenuChevronRightIcon className="ui-dropdown-chevron" />
    </ContextMenuPrimitive.SubTrigger>
  );
}

function ContextMenuSubContent({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.SubContent>) {
  return (
    <ContextMenuPrimitive.SubContent
      className={cn(
        "ui-dropdown-content ui-dropdown-sub-content ui-context-content ui-context-sub-content",
        className,
      )}
      {...props}
    />
  );
}

function ContextMenuContent({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Content>) {
  return (
    <ContextMenuPrimitive.Portal>
      <ContextMenuPrimitive.Content
        className={cn("ui-dropdown-content ui-context-content", className)}
        {...props}
      />
    </ContextMenuPrimitive.Portal>
  );
}

function ContextMenuItem({
  className,
  inset = false,
  variant = "default",
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <ContextMenuPrimitive.Item
      data-inset={inset ? "true" : undefined}
      data-variant={variant}
      className={cn("ui-dropdown-item", className)}
      {...props}
    />
  );
}

function ContextMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.CheckboxItem>) {
  return (
    <ContextMenuPrimitive.CheckboxItem
      checked={checked}
      className={cn("ui-dropdown-item ui-dropdown-item--with-indicator", className)}
      {...props}
    >
      <span className="ui-dropdown-indicator" aria-hidden>
        <ContextMenuPrimitive.ItemIndicator>
          <MenuCheckIcon className="ui-dropdown-indicator-icon" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.CheckboxItem>
  );
}

function ContextMenuRadioItem({
  className,
  children,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.RadioItem>) {
  return (
    <ContextMenuPrimitive.RadioItem
      className={cn("ui-dropdown-item ui-dropdown-item--with-indicator", className)}
      {...props}
    >
      <span className="ui-dropdown-indicator" aria-hidden>
        <ContextMenuPrimitive.ItemIndicator>
          <MenuDotIcon className="ui-dropdown-indicator-icon" />
        </ContextMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </ContextMenuPrimitive.RadioItem>
  );
}

function ContextMenuLabel({
  className,
  inset = false,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <ContextMenuPrimitive.Label
      data-inset={inset ? "true" : undefined}
      className={cn("ui-dropdown-label", className)}
      {...props}
    />
  );
}

function ContextMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof ContextMenuPrimitive.Separator>) {
  return (
    <ContextMenuPrimitive.Separator
      className={cn("ui-dropdown-separator", className)}
      {...props}
    />
  );
}

function ContextMenuShortcut({
  className,
  ...props
}: ComponentProps<"span">) {
  return <span className={cn("ui-dropdown-shortcut", className)} {...props} />;
}

export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuCheckboxItem,
  ContextMenuRadioItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuGroup,
  ContextMenuPortal,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuRadioGroup,
};
