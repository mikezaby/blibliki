import { ModuleType } from "@blibliki/engine";
import Fader from "@/components/Fader";
import { ModuleComponent } from "..";
import Container from "../Container";

const Envelope: ModuleComponent<ModuleType.Envelope> = (props) => {
  const {
    updateProp,
    props: { attack, decay, sustain, release },
  } = props;

  return (
    <Container>
      <Fader name="A" onChange={updateProp("attack")} value={attack} />
      <Fader name="D" onChange={updateProp("decay")} value={decay} />
      <Fader name="S" onChange={updateProp("sustain")} value={sustain} />
      <Fader name="R" onChange={updateProp("release")} value={release} />
    </Container>
  );
};

export default Envelope;
