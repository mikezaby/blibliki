import { ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useAppDispatch, useAppSelector } from "@/hooks";
import { close as _close } from "./modalSlice";

export { open, close } from "./modalSlice";
export { default as TriggerModal } from "./TriggerModal";

type ModalProps = {
  children: ReactNode;
  modalName: string;
  className?: string;
  onClose?: () => void;
};

export default function Modal(props: ModalProps) {
  const { children, modalName, className, onClose } = props;

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
      <DialogContent className={className}>
        <DialogTitle className="sr-only">{modalName}</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}
