import { ModuleType } from "@blibliki/engine";
import { Input, Label } from "@blibliki/ui";
import { ChangeEvent } from "react";
import { useAppDispatch } from "@/hooks";
import { updateModule } from "../modulesSlice";

type NameInterface = {
  id: string;
  moduleType: ModuleType;
  value: number;
};

export default function Voices(props: NameInterface) {
  const dispatch = useAppDispatch();
  const { id, value, moduleType } = props;

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    dispatch(
      updateModule({
        id,
        moduleType,
        changes: { voices: Number(event.target.value) },
      }),
    );
  };

  return (
    <div className="space-y-3 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-lg border border-slate-200 dark:border-slate-700">
      <Label className="text-xs font-medium text-slate-600 dark:text-slate-400">
        Voices
      </Label>
      <Input type="number" value={value} onChange={onChange} min="1" max="64" />
    </div>
  );
}
