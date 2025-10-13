import { ReactNode } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
  const { children, modalName, onClose } = props;

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
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col justify-cent items-center space-x-2">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}
