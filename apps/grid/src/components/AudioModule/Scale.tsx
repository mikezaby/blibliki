import { moduleSchemas, ModuleType } from "@blibliki/engine";
import { ModuleComponent } from ".";
import Container from "./Container";
import { InputField } from "./attributes/Field";

const Scale: ModuleComponent<ModuleType.Scale> = (props) => {
  const {
    updateProp,
    props: { min, max, current },
  } = props;

  return (
    <Container>
      <InputField
        name="min"
        value={min}
        schema={moduleSchemas[ModuleType.Scale].min}
        onChange={updateProp("min")}
      />
      <InputField
        name="max"
        value={max}
        schema={moduleSchemas[ModuleType.Scale].max}
        onChange={updateProp("max")}
      />
      <InputField
        name="current"
        value={current}
        schema={moduleSchemas[ModuleType.Scale].current}
        onChange={updateProp("current")}
      />
    </Container>
  );
};

export default Scale;
