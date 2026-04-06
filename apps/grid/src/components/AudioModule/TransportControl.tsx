import { moduleSchemas, ModuleType } from "@blibliki/engine";
import type { ModuleComponent } from ".";
import Container from "./Container";
import { InputField } from "./attributes/Field";

const schema = moduleSchemas[ModuleType.TransportControl];

const TransportControl: ModuleComponent<ModuleType.TransportControl> = (
  props,
) => {
  const {
    updateProp,
    props: { bpm, swing },
  } = props;

  return (
    <Container>
      <InputField
        value={bpm}
        schema={schema.bpm}
        onChange={updateProp("bpm")}
      />
      <InputField
        value={swing}
        schema={schema.swing}
        onChange={updateProp("swing")}
      />
    </Container>
  );
};

export default TransportControl;
