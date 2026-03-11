import {
  ModuleType,
  ModuleTypeToPropsMapping,
  moduleSchemas,
} from "@blibliki/engine";
import { Fader, type MarkProps } from "@blibliki/ui";
import { ModuleComponent } from ".";
import Container from "./Container";

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

  const onChange = (
    prop: keyof ModuleTypeToPropsMapping[ModuleType.Distortion],
  ) => {
    const update = updateProp(prop);

    return (_: number, calcValue: number) => {
      update(calcValue);
    };
  };

  return (
    <Container>
      <Fader
        name="Drive"
        min={schema.drive.min}
        max={schema.drive.max}
        step={schema.drive.step}
        value={drive}
        onChange={onChange("drive")}
      />

      <Fader
        name="Tone"
        min={schema.tone.min}
        max={schema.tone.max}
        step={schema.tone.step}
        exp={schema.tone.exp}
        value={tone}
        onChange={onChange("tone")}
      />

      <Fader
        name="Mix"
        marks={MIX_MARKS}
        min={schema.mix.min}
        max={schema.mix.max}
        step={schema.mix.step}
        value={mix}
        onChange={onChange("mix")}
      />
    </Container>
  );
};

export default Distortion;
