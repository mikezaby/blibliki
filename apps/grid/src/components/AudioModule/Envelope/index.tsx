import {
  moduleSchemas,
  ModuleType,
  ModuleTypeToPropsMapping,
} from "@blibliki/engine";
import { Fader } from "@blibliki/ui";
import { ModuleComponent } from "..";
import Container from "../Container";
import { CheckboxField } from "../attributes/Field";

const schema = moduleSchemas[ModuleType.Envelope];

const Envelope: ModuleComponent<ModuleType.Envelope> = (props) => {
  const {
    updateProp,
    props: { attack, decay, sustain, release, retrigger },
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
    <div className="flex flex-col gap-y-8">
      <Container className="justify-start">
        <CheckboxField
          value={retrigger}
          schema={schema.retrigger}
          onChange={updateProp("retrigger")}
        />
      </Container>

      <Container>
        <Fader
          name="A"
          onChange={onChange("attack")}
          min={schema.attack.min}
          max={schema.attack.max}
          exp={schema.attack.exp}
          value={attack}
        />
        <Fader
          name="D"
          onChange={onChange("decay")}
          min={schema.decay.min}
          max={schema.decay.max}
          exp={schema.decay.exp}
          value={decay}
        />
        <Fader name="S" onChange={updateProp("sustain")} value={sustain} />
        <Fader
          name="R"
          onChange={onChange("release")}
          min={schema.release.min}
          max={schema.release.max}
          exp={schema.release.exp}
          value={release}
        />
      </Container>
    </div>
  );
};

export default Envelope;
