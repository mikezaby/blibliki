import {
  moduleSchemas,
  ModuleType,
  ModuleTypeToPropsMapping,
} from "@blibliki/engine";
import { Fader } from "@blibliki/ui";
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
        min={moduleSchemas[ModuleType.Envelope].attack.min}
        max={moduleSchemas[ModuleType.Envelope].attack.max}
        exp={moduleSchemas[ModuleType.Envelope].attack.exp}
        value={attack}
      />
      <Fader
        name="D"
        onChange={onChange("decay")}
        min={moduleSchemas[ModuleType.Envelope].decay.min}
        max={moduleSchemas[ModuleType.Envelope].decay.max}
        exp={moduleSchemas[ModuleType.Envelope].decay.exp}
        value={decay}
      />
      <Fader name="S" onChange={updateProp("sustain")} value={sustain} />
      <Fader
        name="R"
        onChange={onChange("release")}
        min={moduleSchemas[ModuleType.Envelope].release.min}
        max={moduleSchemas[ModuleType.Envelope].release.max}
        exp={moduleSchemas[ModuleType.Envelope].release.exp}
        value={release}
      />
    </Container>
  );
};

export default Envelope;
