import { ModuleType } from "@blibliki/engine";
import Fader, { MarkProps } from "@/components/Fader";
import { ModuleComponent } from "..";
import Container from "../Container";
import Cutoff from "./Cutoff";
import FilterType from "./FilterType";
import Resonance from "./Resonance";

const AmountCenter: MarkProps[] = [{ value: 0, label: "-" }];

const BiquadFilter: ModuleComponent<ModuleType.BiquadFilter> = (props) => {
  const {
    updateProp,
    props: { cutoff, Q, type, envelopeAmount },
  } = props;

  return (
    <Container>
      <Cutoff value={cutoff} updateProp={updateProp("cutoff")} />
      <Resonance value={Q} updateProp={updateProp("Q")} />
      <Fader
        name="Amount"
        marks={AmountCenter}
        min={-1}
        max={1}
        step={0.01}
        onChange={updateProp("envelopeAmount")}
        value={envelopeAmount}
      />
      <FilterType value={type} updateProp={updateProp("type")} />
    </Container>
  );
};

export default BiquadFilter;
