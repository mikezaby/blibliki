import { ModuleType } from "@blibliki/engine";
import { Fader, type MarkProps } from "@blibliki/ui";
import { ModuleComponent } from "..";
import Container from "../Container";

const PAN_MARKS: MarkProps[] = [
  { value: -1, label: "L" },
  { value: 0, label: "C" },
  { value: 1, label: "R" },
];

const StereoPanner: ModuleComponent<ModuleType.StereoPanner> = (props) => {
  const {
    updateProp,
    props: { pan },
  } = props;

  return (
    <Container>
      <Fader
        name="Pan"
        orientation="horizontal"
        marks={PAN_MARKS}
        onChange={updateProp("pan")}
        value={pan}
        min={-1}
        max={1}
        step={0.01}
      />
    </Container>
  );
};

export default StereoPanner;
