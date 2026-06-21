import { moduleSchemas, ModuleType } from "@blibliki/engine";
import { Fader } from "@blibliki/ui";
import { ModuleComponent } from "..";
import Container from "../Container";

const volumeSchema = moduleSchemas[ModuleType.Volume].volume;

const Volume: ModuleComponent<ModuleType.Volume> = (props) => {
  const {
    updateProp,
    props: { volume },
  } = props;
  const onChange = (_: number, calculatedValue: number) => {
    updateProp("volume")(calculatedValue);
  };

  return (
    <Container>
      <Fader
        name="Volume (dB)"
        onChange={onChange}
        value={volume}
        min={volumeSchema.min}
        max={volumeSchema.max}
        step={volumeSchema.step}
        exp={volumeSchema.exp}
      />
    </Container>
  );
};

export default Volume;
