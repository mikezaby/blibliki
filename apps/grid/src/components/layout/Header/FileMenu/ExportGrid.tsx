import type { IPatch } from "@blibliki/models";
import { modulesSelector } from "@/components/AudioModule/modulesSlice";
import { useAppSelector } from "@/hooks";

export default function ExportGrid() {
  const { patch } = useAppSelector((state) => state.patch);
  const gridNodes = useAppSelector((state) => state.gridNodes);
  const modules = useAppSelector((state) => modulesSelector.selectAll(state));

  const exportJSON = () => {
    const data: IPatch = {
      id: "",
      userId: "",
      name: patch.name,
      config: { modules, gridNodes },
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

  return <button onClick={exportJSON}>Export for Grid</button>;
}
