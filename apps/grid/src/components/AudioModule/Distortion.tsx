import { ModuleType, moduleSchemas } from "@blibliki/engine";
import { Fader, type MarkProps } from "@blibliki/ui";
import { ModuleComponent } from ".";
import Container from "./Container";

const DRIVE_MARKS: MarkProps[] = [
  { value: 0, label: "Clean" },
  { value: 3, label: "Crunch" },
  { value: 6, label: "Heavy" },
  { value: 10, label: "Extreme" },
];

const TONE_MARKS: MarkProps[] = [
  { value: 200, label: "200Hz" },
  { value: 1000, label: "1kHz" },
  { value: 5000, label: "5kHz" },
  { value: 20000, label: "20kHz" },
];

const MIX_MARKS: MarkProps[] = [
  { value: 0, label: "Dry" },
  { value: 0.5, label: "50%" },
  { value: 1, label: "Wet" },
];

const Distortion: ModuleComponent<ModuleType.Distortion> = (props) => {
  const {
    updateProp,
    props: { drive, tone, mix },
  } = props;

  const schema = moduleSchemas[ModuleType.Distortion];

  return (
    <Container>
      <Fader
        name="Drive"
        marks={DRIVE_MARKS}
        min={schema.drive.min}
        max={schema.drive.max}
        step={schema.drive.step}
        value={drive}
        onChange={updateProp("drive")}
      />

      <Fader
        name="Tone"
        marks={TONE_MARKS}
        min={schema.tone.min}
        max={schema.tone.max}
        step={schema.tone.step}
        exp={schema.tone.exp}
        value={tone}
        onChange={updateProp("tone")}
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
  );
};

export default Distortion;
