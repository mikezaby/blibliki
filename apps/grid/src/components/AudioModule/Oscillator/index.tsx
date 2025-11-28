import { moduleSchemas, ModuleType, OscillatorWave } from "@blibliki/engine";
import Fader, { MarkProps } from "@/components/Fader";
import { ModuleComponent } from "..";
import Container from "../Container";

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

const Oscillator: ModuleComponent<ModuleType.Oscillator> = (props) => {
  const {
    updateProp,
    props: { octave, coarse, fine, wave: waveName },
  } = props;

  const waveIndex = WAVES.findIndex((w) => w === waveName);

  const updateWaveProp = (value: number) => {
    const wave = WAVES[value];
    if (!wave) throw Error(`Out of bound value ${value}`);
    updateProp("wave")(wave);
  };

  return (
    <Container>
      <Fader
        name="Octave"
        marks={RANGES}
        min={moduleSchemas[ModuleType.Oscillator].octave.min}
        max={moduleSchemas[ModuleType.Oscillator].octave.max}
        step={moduleSchemas[ModuleType.Oscillator].octave.step}
        exp={moduleSchemas[ModuleType.Oscillator].octave.exp}
        onChange={updateProp("octave")}
        value={octave}
      />
      <Fader
        name="Coarse"
        marks={Center}
        min={moduleSchemas[ModuleType.Oscillator].coarse.min}
        max={moduleSchemas[ModuleType.Oscillator].coarse.max}
        step={moduleSchemas[ModuleType.Oscillator].coarse.step}
        exp={moduleSchemas[ModuleType.Oscillator].coarse.exp}
        onChange={updateProp("coarse")}
        value={coarse}
      />
      <Fader
        name="Fine"
        marks={Center}
        min={moduleSchemas[ModuleType.Oscillator].fine.min}
        max={moduleSchemas[ModuleType.Oscillator].fine.max}
        step={moduleSchemas[ModuleType.Oscillator].fine.step}
        exp={moduleSchemas[ModuleType.Oscillator].fine.exp}
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
  );
};

export default Oscillator;
