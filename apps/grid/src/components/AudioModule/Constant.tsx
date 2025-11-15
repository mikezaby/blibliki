import { moduleSchemas, ModuleType } from "@blibliki/engine";
import { ModuleComponent } from ".";
import Container from "./Container";
import { InputField } from "./attributes/Field";

const Constant: ModuleComponent<ModuleType.Constant> = (props) => {
  const {
    updateProp,
    props: { value },
  } = props;

  return (
    <Container>
      <InputField
        name="value"
        value={value}
        schema={moduleSchemas[ModuleType.Constant].value}
        onChange={updateProp("value")}
      />
    </Container>
  );
};

export default Constant;
