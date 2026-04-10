import { GainNode } from "@blibliki/utils/web-audio-api";
import { IModule, Module, SetterHooks } from "@/core";
import { ModulePropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

export type IDrumMachine = IModule<ModuleType.DrumMachine>;

type DrumVoice =
  | "kick"
  | "snare"
  | "tom"
  | "cymbal"
  | "cowbell"
  | "clap"
  | "openHat"
  | "closedHat";

const DRUM_VOICES = [
  "kick",
  "snare",
  "tom",
  "cymbal",
  "cowbell",
  "clap",
  "openHat",
  "closedHat",
] as const satisfies readonly DrumVoice[];

const OUTPUT_NAMES: Record<DrumVoice, string> = {
  kick: "kick out",
  snare: "snare out",
  tom: "tom out",
  cymbal: "cymbal out",
  cowbell: "cowbell out",
  clap: "clap out",
  openHat: "open hat out",
  closedHat: "closed hat out",
};

export type IDrumMachineProps = {
  masterLevel: number;
  kickLevel: number;
  kickDecay: number;
  kickTone: number;
  snareLevel: number;
  snareDecay: number;
  snareTone: number;
  tomLevel: number;
  tomDecay: number;
  tomTone: number;
  cymbalLevel: number;
  cymbalDecay: number;
  cymbalTone: number;
  cowbellLevel: number;
  cowbellDecay: number;
  cowbellTone: number;
  clapLevel: number;
  clapDecay: number;
  clapTone: number;
  openHatLevel: number;
  openHatDecay: number;
  openHatTone: number;
  closedHatLevel: number;
  closedHatDecay: number;
  closedHatTone: number;
};

const numberProp = (
  label: string,
  shortLabel: string,
  min: number,
  max: number,
  step: number,
): {
  kind: "number";
  label: string;
  shortLabel: string;
  min: number;
  max: number;
  step: number;
} => ({
  kind: "number",
  label,
  shortLabel,
  min,
  max,
  step,
});

export const drumMachinePropSchema: ModulePropSchema<IDrumMachineProps> = {
  masterLevel: numberProp("Master Level", "mst", 0, 1.5, 0.01),
  kickLevel: numberProp("Kick Level", "k-l", 0, 1.5, 0.01),
  kickDecay: numberProp("Kick Decay", "k-d", 0.01, 4, 0.01),
  kickTone: numberProp("Kick Tone", "k-t", 0, 1, 0.01),
  snareLevel: numberProp("Snare Level", "s-l", 0, 1.5, 0.01),
  snareDecay: numberProp("Snare Decay", "s-d", 0.01, 4, 0.01),
  snareTone: numberProp("Snare Tone", "s-t", 0, 1, 0.01),
  tomLevel: numberProp("Tom Level", "t-l", 0, 1.5, 0.01),
  tomDecay: numberProp("Tom Decay", "t-d", 0.01, 4, 0.01),
  tomTone: numberProp("Tom Tone", "t-t", 0, 1, 0.01),
  cymbalLevel: numberProp("Cymbal Level", "c-l", 0, 1.5, 0.01),
  cymbalDecay: numberProp("Cymbal Decay", "c-d", 0.01, 4, 0.01),
  cymbalTone: numberProp("Cymbal Tone", "c-t", 0, 1, 0.01),
  cowbellLevel: numberProp("Cowbell Level", "cb-l", 0, 1.5, 0.01),
  cowbellDecay: numberProp("Cowbell Decay", "cb-d", 0.01, 4, 0.01),
  cowbellTone: numberProp("Cowbell Tone", "cb-t", 0, 1, 0.01),
  clapLevel: numberProp("Clap Level", "cl-l", 0, 1.5, 0.01),
  clapDecay: numberProp("Clap Decay", "cl-d", 0.01, 4, 0.01),
  clapTone: numberProp("Clap Tone", "cl-t", 0, 1, 0.01),
  openHatLevel: numberProp("Open Hat Level", "oh-l", 0, 1.5, 0.01),
  openHatDecay: numberProp("Open Hat Decay", "oh-d", 0.01, 4, 0.01),
  openHatTone: numberProp("Open Hat Tone", "oh-t", 0, 1, 0.01),
  closedHatLevel: numberProp("Closed Hat Level", "ch-l", 0, 1.5, 0.01),
  closedHatDecay: numberProp("Closed Hat Decay", "ch-d", 0.01, 4, 0.01),
  closedHatTone: numberProp("Closed Hat Tone", "ch-t", 0, 1, 0.01),
};

const DEFAULT_PROPS: IDrumMachineProps = {
  masterLevel: 1,
  kickLevel: 1,
  kickDecay: 0.5,
  kickTone: 0.5,
  snareLevel: 1,
  snareDecay: 0.4,
  snareTone: 0.5,
  tomLevel: 1,
  tomDecay: 0.5,
  tomTone: 0.5,
  cymbalLevel: 1,
  cymbalDecay: 1.5,
  cymbalTone: 0.5,
  cowbellLevel: 1,
  cowbellDecay: 0.5,
  cowbellTone: 0.5,
  clapLevel: 1,
  clapDecay: 0.4,
  clapTone: 0.5,
  openHatLevel: 1,
  openHatDecay: 0.8,
  openHatTone: 0.5,
  closedHatLevel: 1,
  closedHatDecay: 0.2,
  closedHatTone: 0.5,
};

const createVoiceBuses = (
  context: BaseAudioContext,
): Record<DrumVoice, GainNode> => ({
  kick: new GainNode(context),
  snare: new GainNode(context),
  tom: new GainNode(context),
  cymbal: new GainNode(context),
  cowbell: new GainNode(context),
  clap: new GainNode(context),
  openHat: new GainNode(context),
  closedHat: new GainNode(context),
});

export default class DrumMachine
  extends Module<ModuleType.DrumMachine>
  implements Pick<SetterHooks<IDrumMachineProps>, "onAfterSetMasterLevel">
{
  declare audioNode: undefined;
  private readonly masterBus: GainNode;
  private readonly voiceBuses: Record<DrumVoice, GainNode>;

  constructor(engineId: string, params: ICreateModule<ModuleType.DrumMachine>) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    super(engineId, {
      ...params,
      props,
    });

    this.masterBus = new GainNode(this.context.audioContext, {
      gain: props.masterLevel,
    });
    this.voiceBuses = createVoiceBuses(this.context.audioContext);

    Object.values(this.voiceBuses).forEach((voiceBus) => {
      voiceBus.connect(this.masterBus);
    });

    this.registerIOs();
  }

  onAfterSetMasterLevel: SetterHooks<IDrumMachineProps>["onAfterSetMasterLevel"] =
    (value) => {
      this.masterBus.gain.value = value;
    };

  dispose() {
    Object.values(this.voiceBuses).forEach((voiceBus) => {
      voiceBus.disconnect();
    });
    this.masterBus.disconnect();
    super.dispose();
  }

  private registerIOs() {
    this.registerMidiInput({
      name: "midi in",
      onMidiEvent: this.onMidiEvent,
    });

    this.registerAudioOutput({
      name: "out",
      getAudioNode: () => this.masterBus,
    });

    DRUM_VOICES.forEach((voice) => {
      this.registerAudioOutput({
        name: OUTPUT_NAMES[voice],
        getAudioNode: () => this.voiceBuses[voice],
      });
    });
  }
}
