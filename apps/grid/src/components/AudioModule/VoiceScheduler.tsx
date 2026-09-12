import { ModuleType, moduleSchemas } from "@blibliki/engine";
import { ModuleComponent } from ".";
import Container from "./Container";
import { SelectField } from "./attributes/Field";

const schema = moduleSchemas.VoiceScheduler;

const VoiceScheduler: ModuleComponent<ModuleType.VoiceScheduler> = (props) => {
  const {
    updateProp,
    props: { allocation },
  } = props;

  return (
    <Container>
      <SelectField
        value={allocation}
        schema={schema.allocation}
        onChange={updateProp("allocation")}
      />
    </Container>
  );
};

export default VoiceScheduler;
