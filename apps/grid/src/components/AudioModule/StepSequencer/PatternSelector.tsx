import { IPattern, moduleSchemas, ModuleType } from "@blibliki/engine";
import { Box, Button, Flex, HStack, Text, Textarea } from "@chakra-ui/react";
import { TUpdateProp } from "..";
import { CheckboxField } from "../attributes/Field";

type PatternSelectorProps = {
  patterns: IPattern[];
  activePatternNo: number;
  onPatternChange: (index: number) => void;
  onAddPattern: () => void;
  onDeletePattern: (index: number) => void;
  isRunning?: boolean;
  patternSequence: string;
  enableSequence: boolean;
  sequencePosition?: string;
  updateProp: TUpdateProp<ModuleType.StepSequencer>;
};

const schema = moduleSchemas[ModuleType.StepSequencer];

export default function PatternSelector({
  patterns,
  activePatternNo,
  onPatternChange,
  onAddPattern,
  onDeletePattern,
  patternSequence,
  enableSequence,
  sequencePosition,
  updateProp,
  isRunning = false,
}: PatternSelectorProps) {
  const isSequenceActive = isRunning && enableSequence;
  const formatPatternSequence = (value: string) => {
    const normalized = value.replace(/\s+/g, "");
    const tokens = normalized.match(/\d+[A-Za-z]/g) ?? [];
    const consumed = tokens.join("");
    const remainder = normalized.slice(consumed.length);
    const formattedTokens = tokens
      .map((token, index) =>
        index > 0 && index % 8 === 0 ? `\n${token}` : token,
      )
      .join("");

    if (remainder.length === 0) {
      return formattedTokens;
    }

    const needsNewLine = tokens.length > 0 && tokens.length % 8 === 0;
    return `${formattedTokens}${needsNewLine ? "\n" : ""}${remainder}`;
  };

  const handleSequenceChange = (value: string) => {
    const normalized = value.replace(/\s+/g, "");
    updateProp("patternSequence")(normalized);
  };

  return (
    <Flex justify="space-between" align="center" gap="2" wrap="wrap">
      <Flex direction="column" gap="1">
        <Text fontSize="sm" fontWeight="medium" color="fg">
          Pattern:
        </Text>
        <HStack gap="1" align="center" wrap="wrap">
          {patterns.map((pattern, index) => (
            <Box key={index} position="relative" role="group">
              <Button
                onClick={() => {
                  onPatternChange(index);
                }}
                disabled={isSequenceActive}
                size="xs"
                variant={index === activePatternNo ? "solid" : "subtle"}
                colorPalette={index === activePatternNo ? "blue" : "gray"}
                opacity={isSequenceActive ? 0.5 : 1}
                title={
                  isSequenceActive
                    ? "Pattern selection disabled during sequence playback"
                    : undefined
                }
              >
                {pattern.name}
              </Button>
              {patterns.length > 1 && (
                <Box
                  as="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePattern(index);
                  }}
                  position="absolute"
                  top="-1"
                  right="-1"
                  w="4"
                  h="4"
                  rounded="full"
                  fontSize="xs"
                  lineHeight="1"
                  bg="red.500"
                  color="white"
                  opacity={0}
                  transition="opacity 0.15s ease"
                  _groupHover={{ opacity: 1 }}
                  _hover={{ bg: "red.600" }}
                  title="Delete pattern"
                >
                  ×
                </Box>
              )}
            </Box>
          ))}
          <Button
            onClick={onAddPattern}
            size="xs"
            colorPalette="green"
            variant="solid"
          >
            + New
          </Button>
        </HStack>
      </Flex>

      <Flex gap="2" align="center" wrap="wrap">
        <Flex align="center" gap="2">
          <CheckboxField
            name="Pattern sequence"
            value={enableSequence}
            schema={schema.enableSequence}
            onChange={updateProp("enableSequence")}
          />
        </Flex>

        <Flex align="center" gap="2">
          <Text fontSize="xs" fontWeight="medium" color="fg.muted">
            Sequence:
          </Text>
          <Textarea
            rows={3}
            value={formatPatternSequence(patternSequence)}
            onChange={(e) => {
              handleSequenceChange(e.target.value);
            }}
            disabled={isRunning}
            placeholder="e.g., 2A4B2AC"
            size="sm"
            fontFamily="mono"
            borderColor="border"
            bg="surfaceBg"
            color="fg"
            w="48"
            resize="none"
            lineHeight="5"
          />
          {sequencePosition && (
            <Text fontSize="xs" fontWeight="medium" color="green.500">
              {sequencePosition}
            </Text>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
}
