import { moduleSchemas, ModuleType } from "@blibliki/engine";
import { Stack } from "@blibliki/ui";
import { ModuleComponent } from ".";
import Container from "./Container";
import { InputField, SelectField } from "./attributes/Field";

const Scale: ModuleComponent<ModuleType.Scale> = (props) => {
  const {
    updateProp,
    props: { min, max, current, mode },
  } = props;

  return (
    <Stack gap={6}>
      <Container className="justify-start">
        <SelectField
          name="mode"
          value={mode}
          schema={moduleSchemas[ModuleType.Scale].mode}
          onChange={updateProp("mode")}
        />
      </Container>
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
    </Stack>
  );
};

export default Scale;
