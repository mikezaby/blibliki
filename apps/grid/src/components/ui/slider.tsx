import { Box, Flex, Text, chakra } from "@chakra-ui/react";
import { ChangeEvent } from "react";

type SliderProps = {
  min: number;
  max: number;
  value?: number;
  displayValue?: number;
  defaultValue?: number;
  step?: number;
  marks?: readonly MarkProps[];
  hideMarks?: boolean;
  orientation?: TOrientation;
  onChange: (newValue: number) => void;
};

export type TOrientation = "vertical" | "horizontal";

const BASE_SLIDER_CLASS_NAME = "slider-custom";
const RangeInput = chakra("input");
const MarkButton = chakra("button");

type MarkProps = {
  value: number;
  label: string;
};

const Tooltip = ({ value }: { value: MarkProps | number | undefined }) => {
  return (
    <Box
      position="absolute"
      right="full"
      top="0"
      display="none"
      _groupHover={{ display: "block" }}
      mr="2"
      rounded="md"
      bg="brand.600"
      px="2"
      py="1"
      color="white"
      fontSize="xs"
      whiteSpace="nowrap"
      _before={{
        content: '""',
        position: "absolute",
        right: "-6px",
        top: "50%",
        transform: "translateY(-50%)",
        width: "0",
        height: "0",
        borderTop: "6px solid transparent",
        borderBottom: "6px solid transparent",
        borderLeft: "6px solid",
        borderLeftColor: "brand.600",
      }}
    >
      <Text as="span" fontSize="xs">
        {typeof value === "object" ? value.label : value?.toFixed(2)}
      </Text>
    </Box>
  );
};

export default function Slider(props: SliderProps) {
  const {
    min,
    max,
    value,
    displayValue,
    defaultValue,
    marks,
    hideMarks = false,
    onChange,
    step = 0.01,
    orientation = "horizontal",
  } = props;

  const showTooltip = hideMarks || !marks?.some((m) => m.value);

  const inputClassName =
    orientation === "horizontal"
      ? BASE_SLIDER_CLASS_NAME
      : `${BASE_SLIDER_CLASS_NAME} slider-vertical`;

  const _onChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value));
  };

  const showMarkValue =
    value !== undefined &&
    marks !== undefined &&
    marks.length > 1 &&
    marks.some((m) => !!m.label);
  const displayedValue = showMarkValue ? marks[value] : (displayValue ?? value);

  return (
    <Box
      role="group"
      className="nodrag"
      display="flex"
      gapX="2"
      position="relative"
      flexDirection={orientation === "horizontal" ? "column" : "row"}
      w={orientation === "horizontal" ? "full" : undefined}
    >
      <RangeInput
        type="range"
        min={min}
        max={max}
        value={value}
        defaultValue={defaultValue}
        step={step}
        className={inputClassName}
        onChange={_onChange}
        appearance="none"
        cursor="pointer"
        transition="all 0.2s"
        borderWidth="1px"
        borderColor="border"
        rounded="lg"
        bg="gray.200"
        _hover={{ bg: "gray.300" }}
        _dark={{
          bg: "gray.700",
          borderColor: "gray.600",
          _hover: { bg: "gray.600" },
        }}
        _focusVisible={{
          outline: "none",
          borderColor: "brand.500",
          boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
        }}
      />
      {showTooltip && <Tooltip value={displayedValue} />}

      <Labels
        marks={hideMarks ? undefined : marks}
        orientation={orientation}
        onClick={onChange}
      />
    </Box>
  );
}

function Labels({
  orientation,
  onClick,
  marks,
}: {
  orientation: TOrientation;
  onClick: (newValue: number) => void;
  marks?: readonly MarkProps[];
}) {
  if (!marks) return null;

  const direction = orientation === "vertical" ? "column-reverse" : "row";
  const justify = marks.length === 1 ? "center" : "space-between";

  const _onClick = (value: number) => () => {
    onClick(value);
  };

  return (
    <Flex direction={direction} justify={justify} color="fg" gap="1">
      {marks.map((mark, index) => (
        <MarkButton
          type="button"
          key={index}
          display="flex"
          alignItems="center"
          gap="1"
          fontSize="xs"
          fontWeight="medium"
          color="fg.muted"
          transition="colors 0.2s"
          px="1.5"
          py="1"
          rounded="sm"
          cursor="pointer"
          _hover={{ color: "fg", bg: "bg.muted" }}
          onClick={_onClick(mark.value)}
        >
          <Box
            w="1"
            h="1"
            rounded="full"
            bgGradient="linear(to-br, brand.500, brand.700)"
          />
          {mark.label}
        </MarkButton>
      ))}
    </Flex>
  );
}
