import {
  moduleSchemas,
  ModuleType,
  type ModuleTypeToPropsMapping,
  type NumberProp,
} from "@blibliki/engine";
import { Encoder, Surface } from "@blibliki/ui";
import type { ModuleComponent } from ".";

type DrumMachinePropKey =
  keyof ModuleTypeToPropsMapping[ModuleType.DrumMachine];

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
] as const satisfies readonly {
  label: string;
  level: DrumMachinePropKey;
  decay: DrumMachinePropKey;
  tone: DrumMachinePropKey;
}[];

type EncoderControlProps = {
  propKey: DrumMachinePropKey;
  ariaName: string;
  label?: string;
  size?: "sm" | "md";
  value: number;
  onChange: (value: number) => void;
};

function EncoderControl({
  propKey,
  ariaName,
  label,
  size = "sm",
  value,
  onChange,
}: EncoderControlProps) {
  const propSchema: NumberProp = schema[propKey];

  return (
    <div className="flex flex-col items-center gap-2">
      <Encoder
        name={ariaName}
        min={propSchema.min}
        max={propSchema.max}
        step={propSchema.step}
        exp={propSchema.exp}
        size={size}
        value={value}
        onChange={onChange}
      />
      {label ? (
        <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
          {label}
        </div>
      ) : null}
    </div>
  );
}

const DrumMachine: ModuleComponent<ModuleType.DrumMachine> = (props) => {
  const { updateProp, props: drumProps } = props;

  return (
    <div className="flex flex-col gap-4">
      <Surface
        tone="subtle"
        border="subtle"
        radius="md"
        className="flex items-center justify-between gap-4 p-3"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.22em] opacity-70">
          Master
        </div>
        <EncoderControl
          propKey="masterLevel"
          ariaName="Master level"
          size="md"
          value={drumProps.masterLevel}
          onChange={updateProp("masterLevel")}
        />
      </Surface>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {VOICES.map(({ label, level, decay, tone }) => (
          <Surface
            key={label}
            tone="subtle"
            border="subtle"
            radius="md"
            className="flex flex-col gap-3 p-3"
          >
            <div className="text-xs font-semibold uppercase tracking-[0.22em] opacity-70">
              {label}
            </div>
            <div className="flex items-start justify-between gap-3">
              <EncoderControl
                propKey={level}
                ariaName={`${label} level`}
                label="Level"
                value={drumProps[level]}
                onChange={updateProp(level)}
              />
              <EncoderControl
                propKey={decay}
                ariaName={`${label} decay`}
                label="Decay"
                value={drumProps[decay]}
                onChange={updateProp(decay)}
              />
              <EncoderControl
                propKey={tone}
                ariaName={`${label} tone`}
                label="Tone"
                value={drumProps[tone]}
                onChange={updateProp(tone)}
              />
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
};

export default DrumMachine;
