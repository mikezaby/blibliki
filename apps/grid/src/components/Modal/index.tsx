import { VisuallyHidden } from "@chakra-ui/react";
import type { ComponentProps, ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/hooks";
import { close as _close } from "./modalSlice";

export { open, close } from "./modalSlice";

type ModalProps = {
  children: ReactNode;
  modalName: string;
  className?: string;
  contentProps?: Omit<ComponentProps<typeof DialogContent>, "children">;
  onClose?: () => void;
};

export default function Modal(props: ModalProps) {
  const { children, modalName, className, contentProps, onClose } = props;

  const dispatch = useAppDispatch();
  const { isOpen, modalName: currentModalName } = useAppSelector(
    (state) => state.modal,
  );

  if (currentModalName !== modalName) return null;
  if (!isOpen) return null;

  const close = () => {
    dispatch(_close(modalName));
    onClose?.();
  };

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className={className} {...contentProps}>
        <DialogTitle>
          <VisuallyHidden>{modalName}</VisuallyHidden>
        </DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
