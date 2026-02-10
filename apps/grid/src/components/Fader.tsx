import { throttle } from "@blibliki/utils";
import { Box, Flex, Text } from "@chakra-ui/react";
import { Slider } from "@/ui-system/components";
import type { TOrientation } from "@/ui-system/components/slider";

export type MarkProps = {
  value: number;
  label: string;
};

type FaderProps = {
  name: string;
  onChange: (value: number, calculatedValue: number) => void;
  defaultValue?: number;
  value?: number;
  orientation?: TOrientation;
  marks?: readonly MarkProps[];
  hideMarks?: boolean;
  max?: number;
  min?: number;
  step?: number;
  exp?: number;
};

const calcValue = function (
  sliderValue: number,
  min: number,
  max: number,
  exp?: number,
) {
  if (exp === undefined || exp === 1) return sliderValue;

  const range = max - min;
  const normalizedSlider = (sliderValue - min) / range; // 0 to 1
  const curved = Math.pow(normalizedSlider, exp);

  return min + curved * range;
};

const revCalcValue = function (
  actualValue: number,
  min: number,
  max: number,
  exp?: number,
) {
  if (exp === undefined || exp === 1) return actualValue;

  const range = max - min;
  const normalizedValue = (actualValue - min) / range; // 0 to 1
  const inverseExp = 1 / exp;
  const sliderPosition = Math.pow(normalizedValue, inverseExp);

  return min + sliderPosition * range;
};

export default function Fader(props: FaderProps) {
  const {
    name,
    onChange,
    value,
    defaultValue,
    marks,
    hideMarks = false,
    exp,
    min = 0,
    orientation = "vertical",
  } = props;

  let { max, step } = props;

  if (marks) {
    step ??= 1;
  }

  max ??= marks ? marks.length - 1 : 1;

  const revValue = value && revCalcValue(value, min, max, exp);

  const internalOnChange = (newValue: number) => {
    onChange(newValue, calcValue(newValue, min, max, exp));
  };
  const debouncedOnChange = throttle(internalOnChange, 500);

  return (
    <Flex direction="column" align="center" gap="2" p="2">
      <Slider
        orientation={orientation}
        onChange={debouncedOnChange}
        displayValue={value}
        value={revValue}
        defaultValue={defaultValue}
        min={min}
        max={max}
        step={step ?? 0.01}
        marks={marks}
        hideMarks={hideMarks}
      />

      <Flex align="center" w="full" gap="1.5" mt="1">
        <Box
          w="1.5"
          h="1.5"
          rounded="full"
          bgGradient="linear(to-br, brand.500, brand.700)"
        />
        <Text
          as="label"
          fontSize="xs"
          fontWeight="medium"
          color="fg"
          letterSpacing="tight"
          textAlign="center"
        >
          {name}
        </Text>
      </Flex>
    </Flex>
  );
}
