import { ModuleType } from "@blibliki/engine";
import { Label } from "@radix-ui/react-label";
import { ChangeEvent } from "react";
import { Input } from "@/components/ui";
import { useAppDispatch } from "@/hooks";
import { updateModule } from "../modulesSlice";

interface NameInterface {
  id: string;
  moduleType: ModuleType;
  value: number;
}

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
    <div className="p-2">
      <Label>Voices</Label>
      <Input type="number" value={value} onChange={onChange} />
    </div>
  );
}
