import { ModuleType } from "@blibliki/engine";
import { Box } from "@chakra-ui/react";
import { ChangeEvent } from "react";
import { useAppDispatch } from "@/hooks";
import { Input, Label } from "@/ui-system/components";
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
    <Box
      p="3"
      bg="bg.muted"
      borderWidth="1px"
      borderColor="border"
      rounded="lg"
    >
      <Label fontSize="xs" fontWeight="medium" color="fg.muted" mb="3">
        Voices
      </Label>
      <Input
        type="number"
        value={value}
        onChange={onChange}
        fontSize="sm"
        bg="surfaceBg"
        borderColor="border"
        transition="colors 0.2s"
        min="1"
        max="64"
      />
    </Box>
  );
}
