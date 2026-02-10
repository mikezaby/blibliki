import { ModuleType, moduleSchemas } from "@blibliki/engine";
import { ModuleComponent } from ".";
import Container from "./Container";
import { CheckboxField, InputField } from "./attributes/Field";

const Sampler: ModuleComponent<ModuleType.Sampler> = (props) => {
  const {
    updateProp,
    props: {
      sampleUrl,
      rate,
      semitones,
      rootMidi,
      gain,
      startOffset,
      endOffset,
      loop,
      loopStart,
      loopEnd,
      reverse,
      oneShot,
      attack,
      release,
    },
  } = props;

  return (
    <Container className="flex-col items-stretch gap-y-3">
      <InputField
        name="sampleUrl"
        value={sampleUrl}
        schema={moduleSchemas[ModuleType.Sampler].sampleUrl}
        onChange={updateProp("sampleUrl")}
      />

      <Container>
        <InputField
          name="gain"
          value={gain}
          schema={moduleSchemas[ModuleType.Sampler].gain}
          onChange={updateProp("gain")}
        />
        <InputField
          name="rootMidi"
          value={rootMidi}
          schema={moduleSchemas[ModuleType.Sampler].rootMidi}
          onChange={updateProp("rootMidi")}
        />
      </Container>

      <Container>
        <InputField
          name="rate"
          value={rate}
          schema={moduleSchemas[ModuleType.Sampler].rate}
          onChange={updateProp("rate")}
        />
        <InputField
          name="semitones"
          value={semitones}
          schema={moduleSchemas[ModuleType.Sampler].semitones}
          onChange={updateProp("semitones")}
        />
      </Container>

      <Container>
        <InputField
          name="startOffset"
          value={startOffset}
          schema={moduleSchemas[ModuleType.Sampler].startOffset}
          onChange={updateProp("startOffset")}
        />
        <InputField
          name="endOffset"
          value={endOffset}
          schema={moduleSchemas[ModuleType.Sampler].endOffset}
          onChange={updateProp("endOffset")}
        />
      </Container>

      <Container>
        <InputField
          name="loopStart"
          value={loopStart}
          schema={moduleSchemas[ModuleType.Sampler].loopStart}
          onChange={updateProp("loopStart")}
        />
        <InputField
          name="loopEnd"
          value={loopEnd}
          schema={moduleSchemas[ModuleType.Sampler].loopEnd}
          onChange={updateProp("loopEnd")}
        />
      </Container>

      <Container>
        <InputField
          name="attack"
          value={attack}
          schema={moduleSchemas[ModuleType.Sampler].attack}
          onChange={updateProp("attack")}
        />
        <InputField
          name="release"
          value={release}
          schema={moduleSchemas[ModuleType.Sampler].release}
          onChange={updateProp("release")}
        />
      </Container>

      <Container>
        <CheckboxField
          name="loop"
          value={loop}
          schema={moduleSchemas[ModuleType.Sampler].loop}
          onChange={updateProp("loop")}
        />
        <CheckboxField
          name="reverse"
          value={reverse}
          schema={moduleSchemas[ModuleType.Sampler].reverse}
          onChange={updateProp("reverse")}
        />
        <CheckboxField
          name="oneShot"
          value={oneShot}
          schema={moduleSchemas[ModuleType.Sampler].oneShot}
          onChange={updateProp("oneShot")}
        />
      </Container>
    </Container>
  );
};

export default Sampler;
