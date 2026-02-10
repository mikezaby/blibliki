import { IStep, stepPropSchema } from "@blibliki/engine";
import { Box, Button, Flex, Grid, Text } from "@chakra-ui/react";
import Fader, { MarkProps } from "@/components/Fader";
import CCEditor from "./CCEditor";
import NoteEditor from "./NoteEditor";

type StepEditorProps = {
  step: IStep | undefined;
  stepIndex: number;
  onUpdate: (updates: Partial<IStep>) => void;
};

const DURATION_MARKS: MarkProps[] = stepPropSchema.duration.options.map(
  (duration, i) => {
    return { value: i, label: duration };
  },
);

export default function StepEditor({
  step,
  stepIndex,
  onUpdate,
}: StepEditorProps) {
  if (!step) {
    return (
      <Flex p="6" justify="center" color="fg.muted">
        Select a step to edit
      </Flex>
    );
  }

  const hasNotes = step.notes.length > 0;
  const hasCC = step.ccMessages.length > 0;

  return (
    <Box
      bg="surfaceBg"
      borderWidth="1px"
      borderColor="border"
      rounded="lg"
      overflow="hidden"
    >
      <Flex
        px="4"
        py="3"
        bg="bg.muted"
        borderBottomWidth="1px"
        borderColor="border"
        align="center"
        justify="space-between"
        gap="3"
        wrap="wrap"
      >
        <Flex align="center" gap="3" wrap="wrap">
          <Text fontSize="sm" fontWeight="semibold" color="fg">
            Step {stepIndex + 1}
          </Text>
          <Box
            px="2"
            py="0.5"
            fontSize="xs"
            fontWeight="medium"
            rounded="full"
            bg={step.active ? "green.100" : "gray.200"}
            color={step.active ? "green.700" : "gray.600"}
            _dark={
              step.active
                ? { bg: "green.900", color: "green.300" }
                : { bg: "gray.700", color: "gray.400" }
            }
          >
            {step.active ? "Active" : "Muted"}
          </Box>
          {hasNotes && (
            <Text fontSize="xs" color="fg.muted">
              {step.notes.length} note{step.notes.length !== 1 ? "s" : ""}
            </Text>
          )}
          {hasCC && (
            <Text fontSize="xs" color="fg.muted">
              {step.ccMessages.length} CC
            </Text>
          )}
        </Flex>

        <Flex gap="2">
          <Button
            onClick={() => {
              onUpdate({ probability: 100 });
            }}
            size="xs"
            variant="subtle"
            colorPalette="gray"
            title="Reset probability to 100%"
          >
            100%
          </Button>
          <Button
            onClick={() => {
              onUpdate({ notes: [], ccMessages: [] });
            }}
            size="xs"
            variant="subtle"
            colorPalette="red"
            title="Clear all notes and CC"
          >
            Clear
          </Button>
        </Flex>
      </Flex>

      <Box
        px="4"
        py="3"
        bg="bg.canvas"
        borderBottomWidth="1px"
        borderColor="border"
      >
        <Grid templateColumns="repeat(3, minmax(0, 1fr))" gap="4">
          <Fader
            name={stepPropSchema.probability.label ?? "Probability"}
            value={step.probability}
            onChange={(_, value) => {
              onUpdate({ probability: value });
            }}
            min={stepPropSchema.probability.min}
            max={stepPropSchema.probability.max}
            step={stepPropSchema.probability.step}
            orientation="horizontal"
          />

          <Fader
            name={stepPropSchema.duration.label ?? "Duration"}
            value={stepPropSchema.duration.options.indexOf(step.duration)}
            onChange={(_, value) => {
              const index = Math.round(value);
              const duration = stepPropSchema.duration.options[index];
              onUpdate({ duration });
            }}
            marks={DURATION_MARKS}
            hideMarks
            step={1}
            orientation="horizontal"
          />

          <Fader
            name={stepPropSchema.microtimeOffset.label ?? "Microtiming"}
            value={step.microtimeOffset}
            onChange={(_, value) => {
              onUpdate({ microtimeOffset: value });
            }}
            min={stepPropSchema.microtimeOffset.min}
            max={stepPropSchema.microtimeOffset.max}
            step={stepPropSchema.microtimeOffset.step}
            orientation="horizontal"
          />
        </Grid>
      </Box>

      <Flex p="4" direction="column" gap="4">
        <Flex gap="3" align="center" wrap="wrap">
          <NoteEditor
            notes={step.notes}
            onChange={(notes) => {
              onUpdate({ notes });
            }}
          />

          <Box h="10" w="1px" bg="border" mx="2" />

          <CCEditor
            ccMessages={step.ccMessages}
            onChange={(ccMessages) => {
              onUpdate({ ccMessages });
            }}
          />
        </Flex>

        {(step.notes.length > 0 || step.ccMessages.length > 0) && (
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(2, minmax(0, 1fr))" }}
            gap="2"
          >
            {step.notes.map((note, index) => (
              <Flex
                key={`note-${index}`}
                align="flex-start"
                gap="3"
                p="3"
                bg="bg.muted"
                borderWidth="1px"
                borderColor="border"
                rounded="lg"
                transition="border-color 0.15s ease"
                _hover={{ borderColor: "gray.300" }}
              >
                <Flex align="center" gap="2" minW="60px" pt="2">
                  <Box w="2" h="2" rounded="full" bg="blue.500" />
                  <Text fontFamily="mono" fontSize="sm" fontWeight="semibold">
                    {note.note}
                  </Text>
                </Flex>
                <Box flex="1" minW="0">
                  <Fader
                    name="Velocity"
                    value={note.velocity}
                    onChange={(_, value) => {
                      const updatedNotes = [...step.notes];
                      updatedNotes[index] = { ...note, velocity: value };
                      onUpdate({ notes: updatedNotes });
                    }}
                    min={1}
                    max={127}
                    step={1}
                    orientation="horizontal"
                  />
                </Box>
                <Button
                  onClick={() => {
                    onUpdate({
                      notes: step.notes.filter((_, i) => i !== index),
                    });
                  }}
                  size="xs"
                  variant="subtle"
                  colorPalette="red"
                  flexShrink={0}
                  mt="2"
                >
                  ✕
                </Button>
              </Flex>
            ))}

            {step.ccMessages.map((ccMsg, index) => (
              <Flex
                key={`cc-${index}`}
                align="flex-start"
                gap="3"
                p="3"
                bg="bg.muted"
                borderWidth="1px"
                borderColor="border"
                rounded="lg"
                transition="border-color 0.15s ease"
                _hover={{ borderColor: "gray.300" }}
              >
                <Flex align="center" gap="2" minW="60px" pt="2">
                  <Box w="2" h="2" rounded="full" bg="purple.500" />
                  <Text fontFamily="mono" fontSize="sm" fontWeight="semibold">
                    CC {ccMsg.cc}
                  </Text>
                </Flex>
                <Box flex="1" minW="0">
                  <Fader
                    name="Value"
                    value={ccMsg.value}
                    onChange={(_, value) => {
                      const updatedCC = [...step.ccMessages];
                      updatedCC[index] = { ...ccMsg, value };
                      onUpdate({ ccMessages: updatedCC });
                    }}
                    min={0}
                    max={127}
                    step={1}
                    orientation="horizontal"
                  />
                </Box>
                <Button
                  onClick={() => {
                    onUpdate({
                      ccMessages: step.ccMessages.filter((_, i) => i !== index),
                    });
                  }}
                  size="xs"
                  variant="subtle"
                  colorPalette="red"
                  flexShrink={0}
                  mt="2"
                >
                  ✕
                </Button>
              </Flex>
            ))}
          </Grid>
        )}
      </Flex>
    </Box>
  );
}
