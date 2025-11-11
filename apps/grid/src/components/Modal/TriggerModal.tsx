import { assertNever } from "@blibliki/utils";
import { ReactNode } from "react";
import { useAppDispatch } from "@/hooks";
import { cn } from "@/lib/utils";
import { open, close } from "./modalSlice";

type Props = {
  children: ReactNode;
  className?: string;
  modalName: string;
  type: "open" | "close";
};

export default function TriggerModal(props: Props) {
  const dispatch = useAppDispatch();
  const { children, modalName, type, className } = props;

  const onClick = () => {
    switch (type) {
      case "open":
        dispatch(open(modalName));
        break;
      case "close":
        dispatch(close(modalName));
        break;
      default:
        assertNever(type);
    }
  };

  return (
    <button className={cn("btn", className)} onClick={onClick}>
      {children}
    </button>
  );
}
