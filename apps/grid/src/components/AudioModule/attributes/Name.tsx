import { ModuleType } from "@blibliki/engine";
import { ChangeEvent } from "react";
import { Input, Label } from "@/components/ui";
import { useAppDispatch } from "@/hooks";
import { updateModule } from "../modulesSlice";

interface NameInterface {
  id: string;
  moduleType: ModuleType;
  value: string;
}

export default function Name(props: NameInterface) {
  const dispatch = useAppDispatch();
  const { id, value, moduleType } = props;

  const updateProp = (event: ChangeEvent<HTMLInputElement>) => {
    dispatch(
      updateModule({ id, moduleType, changes: { name: event.target.value } }),
    );
  };

  return (
    <div className="p-2">
      <Label>Name</Label>
      <Input value={value} onChange={updateProp} />
    </div>
  );
}
