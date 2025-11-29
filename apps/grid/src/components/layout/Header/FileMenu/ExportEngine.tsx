import { Engine } from "@blibliki/engine";
import { useAppSelector } from "@/hooks";

export default function ExportEngine() {
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

  return <button onClick={exportJSON}>Export for engine</button>;
}
