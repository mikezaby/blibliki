import { ModuleType } from "@blibliki/engine";
import { ModuleComponent } from ".";
import Select from "../Select";
import Container from "./Container";

const VOICE_SELECTIONS = [1, 2, 3, 4, 5, 6];

const VoiceScheduler: ModuleComponent<ModuleType.VoiceScheduler> = (props) => {
  const {
    updateProp,
    props: { polyNumber },
  } = props;

  return (
    <Container>
      <Select
        value={polyNumber}
        options={VOICE_SELECTIONS}
        onChange={updateProp("polyNumber")}
      />
    </Container>
  );
};

export default VoiceScheduler;
