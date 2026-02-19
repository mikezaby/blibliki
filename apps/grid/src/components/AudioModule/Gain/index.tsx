import { ModuleType } from "@blibliki/engine";
import { Fader } from "@blibliki/ui";
import { ModuleComponent } from "..";
import Container from "../Container";

const Gain: ModuleComponent<ModuleType.Gain> = (props) => {
  const {
    updateProp,
    props: { gain },
  } = props;

  return (
    <Container>
      <Fader
        name="Gain"
        onChange={updateProp("gain")}
        value={gain}
        min={0}
        max={2}
        step={0.01}
      />
    </Container>
  );
};

export default Gain;
