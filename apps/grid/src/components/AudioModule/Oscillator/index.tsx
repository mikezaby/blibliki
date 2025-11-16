import { ModuleType, OscillatorWave } from "@blibliki/engine";
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
        min={-1}
        max={2}
        onChange={updateProp("octave")}
        value={octave}
      />
      <Fader
        name="Coarse"
        marks={Center}
        min={-1}
        max={1}
        step={0.01}
        onChange={updateProp("coarse")}
        value={coarse}
      />
      <Fader
        name="Fine"
        marks={Center}
        min={-1}
        max={1}
        step={0.01}
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
