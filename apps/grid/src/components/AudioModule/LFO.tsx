import { LFOMode, ModuleType } from "@blibliki/engine";
import { moduleSchemas } from "@blibliki/engine";
import type { MarkProps } from "@/components/Fader";
import Fader from "@/components/Fader";
import type { ModuleComponent } from ".";
import Container from "./Container";
import { SelectField } from "./attributes/Field";

const MODE_MARKS: MarkProps[] = [
  { value: 0, label: "Free" },
  { value: 1, label: "BPM" },
];

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

const LFO: ModuleComponent<ModuleType.LFO> = (props) => {
  const {
    updateProp,
    props: { mode, frequency, division, waveform, offset, amount },
  } = props;

  const schema = moduleSchemas[ModuleType.LFO];

  // Mode conversion
  const modeIndex = mode === LFOMode.free ? 0 : 1;
  const updateModeProp = (value: number) => {
    updateProp("mode")(value === 0 ? LFOMode.free : LFOMode.bpm);
  };

  return (
    <div className="flex flex-col gap-y-8">
      <Container className="justify-start">
        {mode === LFOMode.bpm && (
          <SelectField
            name="Division"
            value={division}
            schema={moduleSchemas[ModuleType.LFO].division}
            onChange={updateProp("division")}
          />
        )}

        <SelectField
          name="Waveform"
          value={waveform}
          schema={moduleSchemas[ModuleType.LFO].waveform}
          onChange={updateProp("waveform")}
        />
      </Container>

      <Container>
        <Fader
          name="Mode"
          marks={MODE_MARKS}
          min={0}
          max={1}
          step={1}
          value={modeIndex}
          onChange={updateModeProp}
        />

        {mode === LFOMode.free && (
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
