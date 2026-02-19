import { ModuleType, moduleSchemas } from "@blibliki/engine";
import { Fader, type MarkProps } from "@blibliki/ui";
import { ModuleComponent } from ".";
import Container from "./Container";
import { SelectField } from "./attributes/Field";

const MIX_MARKS: MarkProps[] = [
  { value: 0, label: "Dry" },
  { value: 0.5, label: "50%" },
  { value: 1, label: "Wet" },
];

const DECAY_MARKS: MarkProps[] = [
  { value: 0.1, label: "0.1s" },
  { value: 1, label: "1s" },
  { value: 5, label: "5s" },
  { value: 10, label: "10s" },
];

const PREDELAY_MARKS: MarkProps[] = [
  { value: 0, label: "0ms" },
  { value: 50, label: "50ms" },
  { value: 100, label: "100ms" },
];

const Reverb: ModuleComponent<ModuleType.Reverb> = (props) => {
  const {
    updateProp,
    props: { mix, decayTime, preDelay, type },
  } = props;

  const schema = moduleSchemas[ModuleType.Reverb];

  return (
    <div className="flex flex-col gap-y-8">
      <Container className="justify-start">
        <SelectField
          name="Type"
          value={type}
          schema={schema.type}
          onChange={updateProp("type")}
        />
      </Container>

      <Container>
        <Fader
          name="Decay"
          marks={DECAY_MARKS}
          min={schema.decayTime.min}
          max={schema.decayTime.max}
          step={schema.decayTime.step}
          exp={schema.decayTime.exp}
          value={decayTime}
          onChange={(_: number, calcValue: number) => {
            updateProp("decayTime")(calcValue);
          }}
        />

        <Fader
          name="Pre-delay"
          marks={PREDELAY_MARKS}
          min={schema.preDelay.min}
          max={schema.preDelay.max}
          step={schema.preDelay.step}
          value={preDelay}
          onChange={updateProp("preDelay")}
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
    </div>
  );
};

export default Reverb;
