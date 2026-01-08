import { moduleSchemas, ModuleType, OscillatorWave } from "@blibliki/engine";
import Fader, { MarkProps } from "@/components/Fader";
import { ModuleComponent } from "..";
import Container from "../Container";
import { CheckboxField } from "../attributes/Field";

const Center: MarkProps[] = [{ value: 0, label: "" }];

const WAVES: OscillatorWave[] = Object.values(OscillatorWave);

const WAVE_MARKS: MarkProps[] = [
  { value: 0, label: "sin" },
  { value: 1, label: "tri" },
  { value: 2, label: "sqr" },
  { value: 3, label: "saw" },
];

const RANGES: MarkProps[] = [
  { value: -1, label: "-1" },
  { value: 0, label: "0" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
];

const schema = moduleSchemas[ModuleType.Oscillator];

const Oscillator: ModuleComponent<ModuleType.Oscillator> = (props) => {
  const {
    updateProp,
    props: { octave, coarse, fine, wave: waveName, lowGain },
  } = props;

  const waveIndex = WAVES.findIndex((w) => w === waveName);

  const updateWaveProp = (value: number) => {
    const wave = WAVES[value];
    if (!wave) throw Error(`Out of bound value ${value}`);
    updateProp("wave")(wave);
  };

  return (
    <div className="flex flex-col gap-y-8">
      <Container className="justify-start">
        <CheckboxField
          name="Low gain"
          value={lowGain}
          schema={schema.lowGain}
          onChange={updateProp("lowGain")}
        />
      </Container>
      <Container>
        <Fader
          name="Octave"
          marks={RANGES}
          min={schema.octave.min}
          max={schema.octave.max}
          step={schema.octave.step}
          exp={schema.octave.exp}
          onChange={updateProp("octave")}
          value={octave}
        />
        <Fader
          name="Coarse"
          marks={Center}
          min={schema.coarse.min}
          max={schema.coarse.max}
          step={schema.coarse.step}
          exp={schema.coarse.exp}
          onChange={updateProp("coarse")}
          value={coarse}
        />
        <Fader
          name="Fine"
          marks={Center}
          min={schema.fine.min}
          max={schema.fine.max}
          step={schema.fine.step}
          exp={schema.fine.exp}
          onChange={updateProp("fine")}
          value={fine}
        />
        <Fader
          name="Wave"
          marks={WAVE_MARKS}
          onChange={updateWaveProp}
          value={waveIndex}
        />
      </Container>
    </div>
  );
};

export default Oscillator;
