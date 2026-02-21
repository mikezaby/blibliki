import { ModuleType, moduleSchemas } from "@blibliki/engine";
import { Fader, type MarkProps } from "@blibliki/ui";
import { ModuleComponent } from ".";
import Container from "./Container";

const DEPTH_MARKS: MarkProps[] = [
  { value: 0, label: "0%" },
  { value: 0.5, label: "50%" },
  { value: 1, label: "100%" },
];

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

const Chorus: ModuleComponent<ModuleType.Chorus> = (props) => {
  const {
    updateProp,
    props: { rate, depth, feedback, mix },
  } = props;

  const schema = moduleSchemas[ModuleType.Chorus];

  return (
    <Container>
      <Fader
        name="Rate"
        min={schema.rate.min}
        max={schema.rate.max}
        step={schema.rate.step}
        exp={schema.rate.exp}
        value={rate}
        onChange={(_: number, calcValue: number) => {
          updateProp("rate")(calcValue);
        }}
      />

      <Fader
        name="Depth"
        marks={DEPTH_MARKS}
        min={schema.depth.min}
        max={schema.depth.max}
        step={schema.depth.step}
        value={depth}
        onChange={updateProp("depth")}
      />

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
  );
};

export default Chorus;
