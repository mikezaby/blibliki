import { ModuleType } from "@blibliki/engine";
import { Input, Label, Stack, Surface } from "@blibliki/ui";
import { ChangeEvent } from "react";
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
    <Surface tone="subtle" border="subtle" radius="md" className="p-3">
      <Stack gap={3}>
        <Stack direction="row" align="center" gap={2}>
          <div className="h-2 w-2 rounded-full bg-gradient-to-br from-green-500 to-emerald-600" />
          <Label className="text-xs font-semibold tracking-tight">
            Module Name
          </Label>
        </Stack>
        <Input
          value={value}
          onChange={updateProp}
          placeholder="Enter module name"
        />
      </Stack>
    </Surface>
  );
}
