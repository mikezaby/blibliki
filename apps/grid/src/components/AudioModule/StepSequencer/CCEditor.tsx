import { IStepCC } from "@blibliki/engine";
import { Button } from "@blibliki/ui";
import { Plus } from "lucide-react";
import { useState } from "react";

type CCEditorProps = {
  ccMessages: IStepCC[];
  onChange: (ccMessages: IStepCC[]) => void;
};

export default function CCEditor({ ccMessages, onChange }: CCEditorProps) {
  const [ccInput, setCCInput] = useState("");
  const [valueInput, setValueInput] = useState("64");

  const addCC = () => {
    const ccNum = parseInt(ccInput.trim());
    const ccVal = parseInt(valueInput.trim());

    if (isNaN(ccNum) || ccNum < 0 || ccNum > 127) return;
    if (isNaN(ccVal) || ccVal < 0 || ccVal > 127) return;

    const newCC: IStepCC = {
      cc: ccNum,
      value: ccVal,
    };

    onChange([...ccMessages, newCC]);
    setCCInput("");
    setValueInput("64");
  };

  return (
    <>
      <input
        type="number"
        value={ccInput}
        onChange={(e) => {
          setCCInput(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") addCC();
        }}
        placeholder="CC#"
        min={0}
        max={127}
        className="w-20 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
      />
      <input
        type="number"
        value={valueInput}
        onChange={(e) => {
          setValueInput(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") addCC();
        }}
        placeholder="Value"
        min={0}
        max={127}
        className="w-20 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:focus:ring-purple-400"
      />
      <Button color="secondary" onClick={addCC}>
        <Plus className="w-4 h-4" />
        CC
      </Button>
    </>
  );
}
