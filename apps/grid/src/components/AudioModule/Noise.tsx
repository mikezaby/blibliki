import { moduleSchemas, ModuleType } from "@blibliki/engine";
import type { ModuleComponent } from ".";
import Container from "./Container";
import { SelectField } from "./attributes/Field";

const Noise: ModuleComponent<ModuleType.Noise> = (props) => {
  const {
    updateProp,
    props: { type },
  } = props;

  return (
    <Container>
      <SelectField
        name="type"
        value={type}
        schema={moduleSchemas[ModuleType.Noise].type}
        onChange={updateProp("type")}
      />
    </Container>
  );
};

export default Noise;
