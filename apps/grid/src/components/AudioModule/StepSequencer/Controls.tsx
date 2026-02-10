import { Resolution, PlaybackMode } from "@blibliki/engine";
import {
  Box,
  Button,
  Flex,
  HStack,
  NativeSelect,
  Text,
} from "@chakra-ui/react";

type ControlsProps = {
  stepsPerPage: number;
  resolution: Resolution;
  playbackMode: PlaybackMode;
  isRunning: boolean;
  onStepsChange: (value: number) => void;
  onResolutionChange: (value: Resolution) => void;
  onPlaybackModeChange: (value: PlaybackMode) => void;
  onStart: () => void;
  onStop: () => void;
};

export default function Controls({
  stepsPerPage,
  resolution,
  playbackMode,
  isRunning,
  onStepsChange,
  onResolutionChange,
  onPlaybackModeChange,
  onStart,
  onStop,
}: ControlsProps) {
  return (
    <Flex gap="4" align="center" p="3" bg="bg.muted" rounded="md" wrap="wrap">
      <HStack gap="2">
        <Button
          onClick={onStart}
          disabled={isRunning}
          size="xs"
          colorPalette="green"
          variant="solid"
        >
          Start
        </Button>
        <Button
          onClick={onStop}
          disabled={!isRunning}
          size="xs"
          colorPalette="red"
          variant="solid"
        >
          Stop
        </Button>
      </HStack>

      <Box h="6" w="1px" bg="border" />

      <HStack align="center" gap="2">
        <Text fontSize="xs" fontWeight="medium" color="fg.muted">
          Steps:
        </Text>
        <NativeSelect.Root size="sm" width="16">
          <NativeSelect.Field
            value={stepsPerPage}
            onChange={(e) => {
              onStepsChange(Number(e.target.value));
            }}
          >
            {[4, 8, 12, 16].map((num) => (
              <option key={num} value={num}>
                {num}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </HStack>

      <HStack align="center" gap="2">
        <Text fontSize="xs" fontWeight="medium" color="fg.muted">
          Resolution:
        </Text>
        <NativeSelect.Root size="sm" width="24">
          <NativeSelect.Field
            value={resolution}
            onChange={(e) => {
              onResolutionChange(e.target.value as Resolution);
            }}
          >
            <option value={Resolution.thirtysecond}>1/32</option>
            <option value={Resolution.sixteenth}>1/16</option>
            <option value={Resolution.eighth}>1/8</option>
            <option value={Resolution.quarter}>1/4</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </HStack>

      <HStack align="center" gap="2">
        <Text fontSize="xs" fontWeight="medium" color="fg.muted">
          Mode:
        </Text>
        <NativeSelect.Root size="sm" width="24">
          <NativeSelect.Field
            value={playbackMode}
            onChange={(e) => {
              onPlaybackModeChange(e.target.value as PlaybackMode);
            }}
          >
            <option value={PlaybackMode.loop}>Loop</option>
            <option value={PlaybackMode.oneShot}>One-Shot</option>
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </HStack>
    </Flex>
  );
}
