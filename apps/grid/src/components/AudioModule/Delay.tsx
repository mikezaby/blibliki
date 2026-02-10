import { DelayTimeMode, ModuleType, moduleSchemas } from "@blibliki/engine";
import { Box, Flex } from "@chakra-ui/react";
import Fader, { MarkProps } from "@/components/Fader";
import { ModuleComponent } from ".";
import Container from "./Container";
import { CheckboxField, SelectField } from "./attributes/Field";

const FEEDBACK_MARKS: MarkProps[] = [
  { value: 0, label: "0%" },
  { value: 0.3, label: "30%" },
  { value: 0.6, label: "60%" },
  { value: 0.95, label: "95%" },
];

const MIX_MARKS: MarkProps[] = [
  { value: 0, label: "Dry" },
  { value: 0.5, label: "50%" },
  { value: 1, label: "Wet" },
];

const schema = moduleSchemas.Delay;

const DIVISIONS = schema.division.options;
const DIVISION_MARKS: MarkProps[] = DIVISIONS.map((duration, i) => {
  return { value: i, label: duration };
});

const Delay: ModuleComponent<ModuleType.Delay> = (props) => {
  const {
    updateProp,
    props: { time, timeMode, sync, division, feedback, mix, stereo },
  } = props;

  // Calculate max time based on mode
  const maxTime = timeMode === DelayTimeMode.short ? 2000 : 5000;

  // Division index for fader (0-22)
  const divisionIndex = DIVISIONS.indexOf(division);
  const updateDivision = (index: number) => {
    updateProp("division")(DIVISIONS[index]!);
  };

  return (
    <Flex direction="column" gap="8">
      <Container justify="flex-start">
        <CheckboxField
          name="Sync"
          value={sync}
          schema={schema.sync}
          onChange={updateProp("sync")}
        />

        <Box opacity={sync ? 0.5 : 1} pointerEvents={sync ? "none" : "auto"}>
          <SelectField
            name="Time Mode"
            value={timeMode}
            schema={schema.timeMode}
            onChange={updateProp("timeMode")}
          />
        </Box>

        <CheckboxField
          name="Stereo"
          value={stereo}
          schema={schema.stereo}
          onChange={updateProp("stereo")}
        />
      </Container>

      <Container>
        {sync ? (
          <Fader
            name="Time"
            min={0}
            max={DIVISIONS.length - 1}
            step={1}
            value={divisionIndex}
            onChange={updateDivision}
            marks={DIVISION_MARKS}
            hideMarks={true}
          />
        ) : (
          <Fader
            name="Time"
            min={schema.time.min}
            max={maxTime}
            step={schema.time.step}
            value={time}
            onChange={updateProp("time")}
          />
        )}

        <Fader
          name="Feedback"
          marks={FEEDBACK_MARKS}
          min={schema.feedback.min}
          max={schema.feedback.max}
          step={schema.feedback.step}
          value={feedback}
          onChange={updateProp("feedback")}
        />

        <Fader
          name="Mix"
          marks={MIX_MARKS}
          min={schema.mix.min}
          max={schema.mix.max}
          step={schema.mix.step}
          value={mix}
          onChange={updateProp("mix")}
        />
      </Container>
    </Flex>
  );
};

export default Delay;
