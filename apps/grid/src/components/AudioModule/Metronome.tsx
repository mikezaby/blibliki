import { moduleSchemas, ModuleType } from "@blibliki/engine";
import type { ModuleComponent } from ".";
import Container from "./Container";
import { CheckboxField } from "./attributes/Field";

const schema = moduleSchemas[ModuleType.Metronome];

const Metronome: ModuleComponent<ModuleType.Metronome> = (props) => {
  const {
    updateProp,
    props: { enabled },
  } = props;

  return (
    <Container>
      <CheckboxField
        value={enabled}
        schema={schema.enabled}
        onChange={updateProp("enabled")}
      />
    </Container>
  );
};

export default Metronome;
