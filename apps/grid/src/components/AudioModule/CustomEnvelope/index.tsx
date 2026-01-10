import {
  moduleSchemas,
  ModuleType,
  ModuleTypeToPropsMapping,
} from "@blibliki/engine";
import Fader from "@/components/Fader";
import { ModuleComponent } from "..";
import Container from "../Container";

const CustomEnvelope: ModuleComponent<ModuleType.CustomEnvelope> = (props) => {
  const {
    updateProp,
    props: { attack, attackCurve, decay, sustain, release },
  } = props;

  const onChange = (
    prop: keyof ModuleTypeToPropsMapping[ModuleType.CustomEnvelope],
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
        min={moduleSchemas[ModuleType.CustomEnvelope].attack.min}
        max={moduleSchemas[ModuleType.CustomEnvelope].attack.max}
        exp={moduleSchemas[ModuleType.CustomEnvelope].attack.exp}
        value={attack}
      />
      <Fader
        name="AC"
        onChange={onChange("attackCurve")}
        min={moduleSchemas[ModuleType.CustomEnvelope].attackCurve.min}
        max={moduleSchemas[ModuleType.CustomEnvelope].attackCurve.max}
        value={attackCurve}
      />
      <Fader
        name="D"
        onChange={onChange("decay")}
        min={moduleSchemas[ModuleType.CustomEnvelope].decay.min}
        max={moduleSchemas[ModuleType.CustomEnvelope].decay.max}
        exp={moduleSchemas[ModuleType.CustomEnvelope].decay.exp}
        value={decay}
      />
      <Fader name="S" onChange={updateProp("sustain")} value={sustain} />
      <Fader
        name="R"
        onChange={onChange("release")}
        min={moduleSchemas[ModuleType.CustomEnvelope].release.min}
        max={moduleSchemas[ModuleType.CustomEnvelope].release.max}
        exp={moduleSchemas[ModuleType.CustomEnvelope].release.exp}
        value={release}
      />
    </Container>
  );
};

export default CustomEnvelope;
