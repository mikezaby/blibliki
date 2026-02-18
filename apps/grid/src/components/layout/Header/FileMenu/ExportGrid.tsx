import type { IPatch } from "@blibliki/models";
import { Button } from "@blibliki/ui";
import { ReactNode } from "react";
import { modulesSelector } from "@/components/AudioModule/modulesSlice";
import { useAppSelector } from "@/hooks";

type ExportGridProps = {
  className?: string;
  children?: ReactNode;
};

export default function ExportGrid({ className, children }: ExportGridProps) {
  const { patch } = useAppSelector((state) => state.patch);
  const { bpm } = useAppSelector((state) => state.global);
  const gridNodes = useAppSelector((state) => state.gridNodes);
  const modules = useAppSelector((state) => modulesSelector.selectAll(state));

  const exportJSON = () => {
    const data: IPatch = {
      id: "",
      userId: "",
      name: patch.name,
      config: { bpm, modules, gridNodes },
    };

    const jsonData = JSON.stringify(data);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${patch.name.split(" ").join("_")}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button
      onClick={exportJSON}
      variant="text"
      color="neutral"
      size="sm"
      className={className}
    >
      {children ?? "Export for Grid"}
    </Button>
  );
}
