import {
  DialogBackdrop as ChakraDialogBackdrop,
  DialogCloseTrigger as ChakraDialogCloseTrigger,
  DialogContent as ChakraDialogContent,
  DialogDescription as ChakraDialogDescription,
  DialogFooter as ChakraDialogFooter,
  DialogHeader as ChakraDialogHeader,
  DialogPositioner,
  DialogRoot as ChakraDialogRoot,
  DialogTitle as ChakraDialogTitle,
  DialogTrigger as ChakraDialogTrigger,
  Portal,
  VisuallyHidden,
} from "@chakra-ui/react";
import { XIcon } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";

type DialogProps = Omit<
  React.ComponentProps<typeof ChakraDialogRoot>,
  "onOpenChange"
> & {
  onOpenChange?: (open: boolean) => void;
};

function Dialog({ onOpenChange, ...props }: DialogProps) {
  return (
    <ChakraDialogRoot
      data-slot="dialog"
      onOpenChange={(details) => {
        onOpenChange?.(details.open);
      }}
      {...props}
    />
  );
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof ChakraDialogTrigger>) {
  return <ChakraDialogTrigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  return <Portal data-slot="dialog-portal">{children}</Portal>;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof ChakraDialogCloseTrigger>) {
  return <ChakraDialogCloseTrigger data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  ...props
}: React.ComponentProps<typeof ChakraDialogBackdrop>) {
  return <ChakraDialogBackdrop data-slot="dialog-overlay" {...props} />;
}

function DialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ChakraDialogContent>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPositioner>
        <ChakraDialogContent
          data-slot="dialog-content"
          className={cn(className)}
          {...props}
        >
          {children}
          <DialogClose top="4" insetEnd="4">
            <XIcon size={16} />
            <VisuallyHidden>Close</VisuallyHidden>
          </DialogClose>
        </ChakraDialogContent>
      </DialogPositioner>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  ...props
}: React.ComponentProps<typeof ChakraDialogHeader>) {
  return (
    <ChakraDialogHeader
      data-slot="dialog-header"
      className={cn(className)}
      gap="2"
      textAlign={{ base: "center", sm: "start" }}
      {...props}
    />
  );
}

function DialogFooter({
  className,
  ...props
}: React.ComponentProps<typeof ChakraDialogFooter>) {
  return (
    <ChakraDialogFooter
      data-slot="dialog-footer"
      className={cn(className)}
      flexDirection={{ base: "column-reverse", sm: "row" }}
      justifyContent={{ sm: "flex-end" }}
      gap="2"
      {...props}
    />
  );
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof ChakraDialogTitle>) {
  return (
    <ChakraDialogTitle
      data-slot="dialog-title"
      className={cn(className)}
      fontSize="lg"
      fontWeight="semibold"
      lineHeight="1"
      {...props}
    />
  );
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof ChakraDialogDescription>) {
  return (
    <ChakraDialogDescription
      data-slot="dialog-description"
      className={cn(className)}
      fontSize="sm"
      color="fg.muted"
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
