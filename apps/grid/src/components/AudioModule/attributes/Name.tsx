import { ModuleType } from "@blibliki/engine";
import { ChangeEvent } from "react";
import { Input, Label } from "@/components/ui";
import { useAppDispatch } from "@/hooks";
import { updateModule } from "../modulesSlice";

type NameInterface = {
  id: string;
  moduleType: ModuleType;
  value: string;
};

export default function Name(props: NameInterface) {
  const dispatch = useAppDispatch();
  const { id, value, moduleType } = props;

  const updateProp = (event: ChangeEvent<HTMLInputElement>) => {
    dispatch(
      updateModule({ id, moduleType, changes: { name: event.target.value } }),
    );
  };

  return (
    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full" />
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 tracking-tight">Module Name</Label>
      </div>
      <Input 
        value={value} 
        onChange={updateProp} 
        className="text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-colors"
        placeholder="Enter module name"
      />
    </div>
  );
}
