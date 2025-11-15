import { ModuleType, ModuleTypeToPropsMapping } from "@blibliki/engine";
import Fader from "@/components/Fader";
import { ModuleComponent } from "..";
import Container from "../Container";

const Envelope: ModuleComponent<ModuleType.Envelope> = (props) => {
  const {
    updateProp,
    props: { attack, decay, sustain, release },
  } = props;

  const onChange = (
    prop: keyof ModuleTypeToPropsMapping[ModuleType.Envelope],
  ) => {
    const update = updateProp(prop);

    return (_: number, calcValue: number) => {
      update(calcValue);
    };
  };

  return (
    <Container>
      <Fader
        name="A"
        onChange={onChange("attack")}
        min={0.001}
        max={10}
        exp={3}
        value={attack}
      />
      <Fader
        name="D"
        onChange={onChange("decay")}
        min={0.001}
        max={10}
        exp={3}
        value={decay}
      />
      <Fader name="S" onChange={updateProp("sustain")} value={sustain} />
      <Fader
        name="R"
        onChange={onChange("release")}
        min={0.001}
        max={10}
        exp={3}
        value={release}
      />
    </Container>
  );
};

export default Envelope;
