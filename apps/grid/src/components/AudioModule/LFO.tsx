import {
  LFOMode,
  LFOWaveform,
  ModuleType,
  NOTE_DIVISIONS,
} from "@blibliki/engine";
import { moduleSchemas } from "@blibliki/engine";
import { Label } from "@radix-ui/react-label";
import type { MarkProps } from "@/components/Fader";
import Fader from "@/components/Fader";
import Select from "@/components/Select";
import type { ModuleComponent } from ".";
import Container from "./Container";

const MODE_MARKS: MarkProps[] = [
  { value: 0, label: "Free" },
  { value: 1, label: "BPM" },
];

// Waveform options for dropdown
const WAVEFORM_OPTIONS = [
  { name: "Sine", value: LFOWaveform.sine },
  { name: "Triangle", value: LFOWaveform.triangle },
  { name: "Square", value: LFOWaveform.square },
  { name: "Sawtooth", value: LFOWaveform.sawtooth },
  { name: "Ramp Down", value: LFOWaveform.rampDown },
  { name: "Random", value: LFOWaveform.random },
];

// Division options for dropdown (all 24 divisions)
const DIVISION_OPTIONS = NOTE_DIVISIONS.map((div) => ({
  name: div,
  value: div,
}));

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
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Division</Label>
            <Select
              label="Division"
              value={division}
              options={DIVISION_OPTIONS}
              onChange={updateProp("division")}
            />
          </div>
        )}

        <div className="space-y-2">
          <Label className="text-xs font-semibold">Waveform</Label>
          <Select
            label="Waveform"
            value={waveform}
            options={WAVEFORM_OPTIONS}
            onChange={updateProp("waveform")}
          />
        </div>
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
