import {
  moduleSchemas,
  ModuleType,
  type ModuleTypeToPropsMapping,
  type NumberProp,
} from "@blibliki/engine";
import { Fader } from "@blibliki/ui";
import type { ModuleComponent } from ".";
import Container from "./Container";

type DrumMachinePropKey = keyof ModuleTypeToPropsMapping[ModuleType.DrumMachine];

const schema = moduleSchemas[ModuleType.DrumMachine];

const VOICES = [
  {
    label: "Kick",
    level: "kickLevel",
    decay: "kickDecay",
    tone: "kickTone",
  },
  {
    label: "Snare",
    level: "snareLevel",
    decay: "snareDecay",
    tone: "snareTone",
  },
  {
    label: "Tom",
    level: "tomLevel",
    decay: "tomDecay",
    tone: "tomTone",
  },
  {
    label: "Cymbal",
    level: "cymbalLevel",
    decay: "cymbalDecay",
    tone: "cymbalTone",
  },
  {
    label: "Cowbell",
    level: "cowbellLevel",
    decay: "cowbellDecay",
    tone: "cowbellTone",
  },
  {
    label: "Clap",
    level: "clapLevel",
    decay: "clapDecay",
    tone: "clapTone",
  },
  {
    label: "Open Hat",
    level: "openHatLevel",
    decay: "openHatDecay",
    tone: "openHatTone",
  },
  {
    label: "Closed Hat",
    level: "closedHatLevel",
    decay: "closedHatDecay",
    tone: "closedHatTone",
  },
] as const satisfies ReadonlyArray<{
  label: string;
  level: DrumMachinePropKey;
  decay: DrumMachinePropKey;
  tone: DrumMachinePropKey;
}>;

const DrumMachine: ModuleComponent<ModuleType.DrumMachine> = (props) => {
  const { updateProp, props: drumProps } = props;

  const renderFader = (
    propKey: DrumMachinePropKey,
    name: string,
    value: number,
  ) => {
    const propSchema = schema[propKey] as NumberProp;

    return (
      <Fader
        key={`${name}-${propKey}`}
        name={name}
        min={propSchema.min}
        max={propSchema.max}
        step={propSchema.step}
        exp={propSchema.exp}
        value={value}
        onChange={updateProp(propKey)}
      />
    );
  };

  return (
    <div className="flex flex-col gap-y-8">
      <Container className="justify-start">
        {renderFader("masterLevel", "Master", drumProps.masterLevel)}
      </Container>

      {VOICES.map(({ label, level, decay, tone }) => (
        <div key={label} className="flex flex-col gap-y-2">
          <div className="text-xs font-medium uppercase tracking-wide">
            {label}
          </div>
          <Container>
            {renderFader(level, "Level", drumProps[level])}
            {renderFader(decay, "Decay", drumProps[decay])}
            {renderFader(tone, "Tone", drumProps[tone])}
          </Container>
        </div>
      ))}
    </div>
  );
};

export default DrumMachine;
