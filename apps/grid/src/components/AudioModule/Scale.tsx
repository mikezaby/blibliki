import { moduleSchemas, ModuleType, NumberProp } from "@blibliki/engine";
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
        schema={moduleSchemas[ModuleType.Scale]["min"] as NumberProp}
        onChange={updateProp("min")}
        className="w-20"
      />
      <InputField
        name="max"
        value={max}
        schema={moduleSchemas[ModuleType.Scale]["max"] as NumberProp}
        onChange={updateProp("max")}
        className="w-20"
      />
      <InputField
        name="current"
        value={current}
        schema={moduleSchemas[ModuleType.Scale]["current"] as NumberProp}
        onChange={updateProp("current")}
        className="w-20"
      />
    </Container>
  );
};

export default Scale;
