import { ModuleType } from "@blibliki/engine";
import Fader, { MarkProps } from "@/components/Fader";
import { ModuleComponent } from "..";
import Container from "../Container";
import Cutoff from "./Cutoff";
import Resonance from "./Resonance";

const AmountCenter: MarkProps[] = [{ value: 0, label: "-" }];

const Filter: ModuleComponent<ModuleType.Filter> = (props) => {
  const {
    updateProp,
    props: { cutoff, resonance, envelopeAmount },
  } = props;

  return (
    <Container>
      <Cutoff value={cutoff} updateProp={updateProp("cutoff")} />
      <Resonance value={resonance} updateProp={updateProp("resonance")} />
      <Fader
        name="Amount"
        marks={AmountCenter}
        min={-1}
        max={1}
        step={0.01}
        onChange={updateProp("envelopeAmount")}
        value={envelopeAmount}
      />
    </Container>
  );
};

export default Filter;
