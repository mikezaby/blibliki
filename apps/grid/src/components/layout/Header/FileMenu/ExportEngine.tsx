import { Engine } from "@blibliki/engine";
import { Button } from "@blibliki/ui";
import { ReactNode } from "react";
import { useAppSelector } from "@/hooks";

type ExportEngineProps = {
  className?: string;
  children?: ReactNode;
};

export default function ExportEngine({
  className,
  children,
}: ExportEngineProps) {
  const { patch } = useAppSelector((state) => state.patch);

  const exportJSON = () => {
    const data = Engine.current.serialize();

    const jsonData = JSON.stringify(data);
    const blob = new Blob([jsonData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${patch.name.split(" ").join("_")}_engine.json`;
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
      {children ?? "Export for engine"}
    </Button>
  );
}
