import { ModuleType } from "@blibliki/engine";
import { Input, Label, Stack, Surface } from "@blibliki/ui";
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
    <Surface tone="subtle" border="subtle" radius="md" className="p-3">
      <Stack gap={3}>
        <Label className="text-xs font-medium">Voices</Label>
        <Input
          type="number"
          value={value}
          onChange={onChange}
          min="1"
          max="64"
        />
      </Stack>
    </Surface>
  );
}
