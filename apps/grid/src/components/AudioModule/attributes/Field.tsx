import {
  BooleanProp,
  EnumProp,
  NumberProp,
  PropSchema,
  StringProp,
} from "@blibliki/engine";
import { Box, HStack, chakra } from "@chakra-ui/react";
import { ChangeEvent, ReactNode } from "react";
import Select from "@/components/Select";
import { Input, Label } from "@/ui-system/components";

type FieldProps<T extends string | number | boolean | string[] | number[]> = {
  name: string;
  value?: T;
  schema: PropSchema;
  onChange: (value: T) => void;
  className?: string;
};

type FieldContainerProps = {
  label: string;
  className?: string;
  children: ReactNode;
};

const SwitchButton = chakra("button");

function FieldContainer({ label, className, children }: FieldContainerProps) {
  return (
    <Box
      className={className}
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
          bgGradient="linear(to-br, brand.500, brand.700)"
        />
        <Label
          fontSize="xs"
          fontWeight="semibold"
          color="fg"
          letterSpacing="tight"
        >
          {label}
        </Label>
      </HStack>
      {children}
    </Box>
  );
}

type InputProps<T extends string | number> = FieldProps<T> & {
  schema: NumberProp | StringProp;
};

export const InputField = <T extends string | number>({
  name,
  value,
  schema,
  onChange,
  className,
}: InputProps<T>) => {
  const label = schema.label ?? name;
  const inputType = schema.kind === "string" ? "text" : "number";

  const internalOnChange = (event: ChangeEvent<HTMLInputElement>) => {
    const newValue =
      schema.kind === "string"
        ? event.target.value
        : Number(event.target.value);

    onChange(newValue as T);
  };

  return (
    <FieldContainer label={label} className={className}>
      <Input
        type={inputType}
        value={value}
        onChange={internalOnChange}
        fontSize="sm"
        bg="surfaceBg"
        borderColor="border"
        transition="colors 0.2s"
        w={inputType === "number" ? "20" : undefined}
        textAlign={inputType === "number" ? "center" : undefined}
        fontFamily={inputType === "number" ? "mono" : undefined}
      />
    </FieldContainer>
  );
};

type SelectProps<T extends string | number> = FieldProps<T> & {
  schema: EnumProp<T>;
};

export const SelectField = <T extends string | number>({
  name,
  value,
  schema,
  onChange,
  className,
}: SelectProps<T>) => {
  const label = schema.label ?? name;

  return (
    <FieldContainer label={label} className={className}>
      <Select
        label={""}
        value={value!}
        options={schema.options}
        onChange={onChange}
      />
    </FieldContainer>
  );
};

type CheckboxProps = FieldProps<boolean> & {
  schema: BooleanProp;
};

export const CheckboxField = ({
  name,
  value,
  schema,
  onChange,
  className,
}: CheckboxProps) => {
  const label = schema.label ?? name;

  return (
    <FieldContainer label={label} className={className}>
      <SwitchButton
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => {
          onChange(!value);
        }}
        position="relative"
        display="inline-flex"
        h="6"
        w="11"
        alignItems="center"
        rounded="full"
        transition="background-color 0.2s ease"
        cursor="pointer"
        bg={value ? "green.500" : "red.400"}
        _dark={{ bg: value ? "green.600" : "gray.600" }}
        _focusVisible={{
          outline: "none",
          boxShadow: "0 0 0 2px rgba(77, 120, 244, 0.25)",
        }}
      >
        <Box
          display="inline-block"
          h="5"
          w="5"
          rounded="full"
          bg="white"
          boxShadow="lg"
          transition="transform 0.2s ease"
          pointerEvents="none"
          transform={value ? "translateX(1.25rem)" : "translateX(0.25rem)"}
        />
      </SwitchButton>
    </FieldContainer>
  );
};
