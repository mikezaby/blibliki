import { ModuleType } from "@blibliki/engine";
import { Box, HStack } from "@chakra-ui/react";
import { ChangeEvent } from "react";
import { useAppDispatch } from "@/hooks";
import { Input, Label } from "@/ui-system/components";
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
    <Box
      p="3"
      bg="bg.muted"
      borderWidth="1px"
      borderColor="border"
      rounded="lg"
    >
      <HStack gap="2" mb="3">
        <Box
          w="2"
          h="2"
          rounded="full"
          bgGradient="linear(to-br, green.500, green.600)"
        />
        <Label
          fontSize="xs"
          fontWeight="semibold"
          color="fg"
          letterSpacing="tight"
        >
          Module Name
        </Label>
      </HStack>
      <Input
        value={value}
        onChange={updateProp}
        fontSize="sm"
        bg="surfaceBg"
        borderColor="border"
        transition="colors 0.2s"
        placeholder="Enter module name"
      />
    </Box>
  );
}
