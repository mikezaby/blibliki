import { ModuleType } from "@blibliki/engine";
import { moduleSchemas } from "@blibliki/engine";
import type { MarkProps } from "@blibliki/ui";
import { Fader } from "@blibliki/ui";
import type { ModuleComponent } from ".";
import Container from "./Container";
import { CheckboxField, SelectField } from "./attributes/Field";

const OFFSET_MARKS: MarkProps[] = [
  { value: -1, label: "-1" },
  { value: 0, label: "0" },
  { value: 1, label: "1" },
];

const AMOUNT_MARKS: MarkProps[] = [
  { value: 0, label: "0" },
  { value: 0.5, label: "0.5" },
  { value: 1, label: "1" },
];

const schema = moduleSchemas.LFO;

const DIVISIONS = schema.division.options;
const DIVISION_MARKS: MarkProps[] = DIVISIONS.map((division, i) => {
  return { value: i, label: division };
});

const LFO: ModuleComponent<ModuleType.LFO> = (props) => {
  const {
    updateProp,
    props: { sync, frequency, division, waveform, offset, amount },
  } = props;

  const divisionIndex = DIVISIONS.indexOf(division);
  const updateDivision = (index: number) => {
    updateProp("division")(DIVISIONS[index]!);
  };

  return (
    <div className="flex flex-col gap-y-8">
      <Container className="justify-start">
        <SelectField
          name="Waveform"
          value={waveform}
          schema={moduleSchemas[ModuleType.LFO].waveform}
          onChange={updateProp("waveform")}
        />

        <CheckboxField
          name="Sync"
          value={sync}
          schema={schema.sync}
          onChange={updateProp("sync")}
        />
      </Container>

      <Container>
        {sync ? (
          <Fader
            name="Devision"
            value={divisionIndex}
            onChange={updateDivision}
            marks={DIVISION_MARKS}
            hideMarks={true}
          />
        ) : (
          <Fader
            name="Freq (Hz)"
            min={schema.frequency.min}
            max={schema.frequency.max}
            step={schema.frequency.step}
            exp={schema.frequency.exp}
            value={frequency}
            onChange={(_: number, calcValue: number) => {
              updateProp("frequency")(calcValue);
            }}
          />
        )}

        <Fader
          name="Offset"
          marks={OFFSET_MARKS}
          min={schema.offset.min}
          max={schema.offset.max}
          step={schema.offset.step}
          value={offset}
          onChange={updateProp("offset")}
        />

        <Fader
          name="Amount"
          marks={AMOUNT_MARKS}
          min={schema.amount.min}
          max={schema.amount.max}
          step={schema.amount.step}
          value={amount}
          onChange={updateProp("amount")}
        />
      </Container>
    </div>
  );
};

export default LFO;
