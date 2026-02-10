import { IStep } from "@blibliki/engine";
import { Box, Flex } from "@chakra-ui/react";

type StepButtonProps = {
  step: IStep;
  stepIndex: number;
  isPlaying: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggleActive: () => void;
};

export default function StepButton({
  step,
  stepIndex,
  isPlaying,
  isSelected,
  onSelect,
  onToggleActive,
}: StepButtonProps) {
  const hasNotes = step.notes.length > 0;
  const isActive = step.active;

  // Calculate intensity based on max velocity in step
  const maxVelocity = hasNotes
    ? Math.max(...step.notes.map((n) => n.velocity))
    : 0;
  const intensity = maxVelocity / 127; // 0-1 range

  const getBackgroundProps = () => {
    if (!isActive || !hasNotes) {
      return { bg: "gray.100", _dark: { bg: "gray.700" } };
    }

    if (intensity > 0.66) return { bg: "blue.500", _dark: { bg: "blue.600" } };
    if (intensity > 0.33) return { bg: "blue.400", _dark: { bg: "blue.500" } };
    return { bg: "blue.300", _dark: { bg: "blue.400" } };
  };

  const getBorderProps = () => {
    if (isPlaying) {
      return {
        borderWidth: "2px",
        borderColor: "orange.500",
        boxShadow: "0 0 0 3px rgba(251, 146, 60, 0.35)",
      };
    }
    if (isSelected) {
      return {
        borderWidth: "2px",
        borderColor: "yellow.400",
        _dark: { borderColor: "yellow.500" },
      };
    }
    if (isActive && hasNotes) {
      return {
        borderWidth: "1px",
        borderColor: "blue.600",
        _dark: { borderColor: "blue.400" },
      };
    }
    return {
      borderWidth: "1px",
      borderColor: "gray.300",
      _dark: { borderColor: "gray.600" },
    };
  };

  const getTextColor = () => {
    if (!isActive || !hasNotes) {
      return { color: "gray.400", _dark: { color: "gray.500" } };
    }
    return intensity > 0.5
      ? { color: "white" }
      : { color: "gray.700", _dark: { color: "gray.100" } };
  };

  const activeDotProps = isActive
    ? {
        bg: "green.500",
        borderColor: "green.600",
        _dark: { bg: "green.400", borderColor: "green.500" },
      }
    : {
        bg: "transparent",
        borderColor: "gray.400",
        _dark: { borderColor: "gray.500" },
      };

  return (
    <Flex direction="column" align="center" gap="1">
      <Box
        as="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleActive();
        }}
        w="3"
        h="3"
        rounded="full"
        borderWidth="2px"
        cursor="pointer"
        transition="transform 0.15s ease"
        _hover={{ transform: "scale(1.2)" }}
        {...activeDotProps}
        title={isActive ? "Click to mute step" : "Click to activate step"}
      />

      <Box
        as="button"
        onClick={onSelect}
        position="relative"
        h="12"
        w="full"
        rounded="md"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="xs"
        fontWeight="medium"
        transition="all 0.15s ease"
        _hover={{ transform: "scale(1.05)" }}
        {...getBackgroundProps()}
        {...getBorderProps()}
        {...getTextColor()}
      >
        {stepIndex + 1}
        {hasNotes && (
          <Box
            position="absolute"
            bottom="1"
            right="1"
            w="1"
            h="1"
            rounded="full"
            bg="currentColor"
          />
        )}
      </Box>
    </Flex>
  );
}
