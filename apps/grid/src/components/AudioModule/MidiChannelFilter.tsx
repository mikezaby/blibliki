import { moduleSchemas, ModuleType } from "@blibliki/engine";
import type { ModuleComponent } from ".";
import Container from "./Container";
import { InputField } from "./attributes/Field";

const schema = moduleSchemas[ModuleType.MidiChannelFilter];

const MidiChannelFilter: ModuleComponent<ModuleType.MidiChannelFilter> = (
  props,
) => {
  const {
    updateProp,
    props: { channel },
  } = props;

  return (
    <Container>
      <InputField
        value={channel}
        schema={schema.channel}
        onChange={updateProp("channel")}
      />
    </Container>
  );
};

export default MidiChannelFilter;
