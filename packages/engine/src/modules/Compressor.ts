import { Context } from "@blibliki/utils";
import { GainNode } from "@blibliki/utils/web-audio-api";
import { ModulePropSchema } from "@/core";
import { Module, SetterHooks } from "@/core/module/Module";
import { WetDryMixer } from "@/utils";
import { ICreateModule, ModuleType } from ".";

export type ICompressorProps = {
  threshold: number;
  ratio: number;
  knee: number;
  attack: number;
  release: number;
  makeup: number;
  mix: number;
};

export type ICompressor = Module<ModuleType.Compressor>;

export const compressorPropSchema: ModulePropSchema<ICompressorProps> = {
  threshold: {
    kind: "number",
    min: -60,
    max: 0,
    step: 0.1,
    label: "Threshold",
    shortLabel: "thr",
  },
  ratio: {
    kind: "number",
    min: 1,
    max: 20,
    step: 0.1,
    label: "Ratio",
    shortLabel: "ratio",
  },
  knee: {
    kind: "number",
    min: 0,
    max: 18,
    step: 0.1,
    label: "Knee",
    shortLabel: "knee",
  },
  attack: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.001,
    label: "Attack",
    shortLabel: "atk",
  },
  release: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.001,
    label: "Release",
    shortLabel: "rel",
  },
  makeup: {
    kind: "number",
    min: -24,
    max: 24,
    step: 0.1,
    label: "Makeup",
    shortLabel: "makeup",
  },
  mix: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Mix",
    shortLabel: "mix",
  },
};

const DEFAULT_PROPS: ICompressorProps = {
  threshold: 0,
  ratio: 4,
  knee: 6,
  attack: 0.001,
  release: 0.003,
  makeup: 0,
  mix: 1,
};

const LOOK_AHEAD_SECONDS = 0.006;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeProps(props: ICompressorProps): ICompressorProps {
  return {
    threshold: clamp(props.threshold, -60, 0),
    ratio: clamp(props.ratio, 1, 20),
    knee: clamp(props.knee, 0, 18),
    attack: clamp(props.attack, 0, 1),
    release: clamp(props.release, 0, 1),
    makeup: clamp(props.makeup, -24, 24),
    mix: clamp(props.mix, 0, 1),
  };
}

function decibelsToGain(decibels: number) {
  return 10 ** (decibels / 20);
}

export default class Compressor
  extends Module<ModuleType.Compressor>
  implements SetterHooks<ICompressorProps>
{
  declare audioNode: GainNode;
  private compressorNode: DynamicsCompressorNode;
  private makeupNode: GainNode;
  private dryDelayNode: DelayNode;
  private wetDryMixer: WetDryMixer;
  private outputNode: GainNode;

  constructor(engineId: string, params: ICreateModule<ModuleType.Compressor>) {
    const props = normalizeProps({ ...DEFAULT_PROPS, ...params.props });
    const audioNodeConstructor = (context: Context) =>
      new GainNode(context.audioContext, { gain: 1 });

    super(engineId, {
      ...params,
      audioNodeConstructor,
      props,
    });

    const audioContext = this.context.audioContext;
    this.compressorNode = audioContext.createDynamicsCompressor();
    this.makeupNode = audioContext.createGain();
    this.dryDelayNode = audioContext.createDelay(LOOK_AHEAD_SECONDS);
    this.wetDryMixer = new WetDryMixer(this.context);
    this.outputNode = this.wetDryMixer.getOutput();

    this.audioNode.connect(this.compressorNode);
    this.compressorNode.connect(this.makeupNode);
    this.makeupNode.connect(this.wetDryMixer.getWetInput());

    this.audioNode.connect(this.dryDelayNode);
    this.dryDelayNode.connect(this.wetDryMixer.getDryInput());

    this.applyCompressorProps(props);
    this.dryDelayNode.delayTime.value = LOOK_AHEAD_SECONDS;
    this.makeupNode.gain.value = decibelsToGain(props.makeup);
    this.wetDryMixer.setMix(props.mix);

    this.registerDefaultIOs("in");
    this.registerAudioOutput({
      name: "out",
      getAudioNode: () => this.outputNode,
    });
  }

  private applyCompressorProps(props: ICompressorProps) {
    this.compressorNode.threshold.value = props.threshold;
    this.compressorNode.ratio.value = props.ratio;
    this.compressorNode.knee.value = props.knee;
    this.compressorNode.attack.value = props.attack;
    this.compressorNode.release.value = props.release;
  }

  getReduction() {
    return this.compressorNode.reduction;
  }

  onSetThreshold: SetterHooks<ICompressorProps>["onSetThreshold"] = (value) =>
    clamp(value, -60, 0);

  onAfterSetThreshold: SetterHooks<ICompressorProps>["onAfterSetThreshold"] = (
    value,
  ) => {
    this.compressorNode.threshold.value = value;
  };

  onSetRatio: SetterHooks<ICompressorProps>["onSetRatio"] = (value) =>
    clamp(value, 1, 20);

  onAfterSetRatio: SetterHooks<ICompressorProps>["onAfterSetRatio"] = (
    value,
  ) => {
    this.compressorNode.ratio.value = value;
  };

  onSetKnee: SetterHooks<ICompressorProps>["onSetKnee"] = (value) =>
    clamp(value, 0, 18);

  onAfterSetKnee: SetterHooks<ICompressorProps>["onAfterSetKnee"] = (value) => {
    this.compressorNode.knee.value = value;
  };

  onSetAttack: SetterHooks<ICompressorProps>["onSetAttack"] = (value) =>
    clamp(value, 0, 1);

  onAfterSetAttack: SetterHooks<ICompressorProps>["onAfterSetAttack"] = (
    value,
  ) => {
    this.compressorNode.attack.value = value;
  };

  onSetRelease: SetterHooks<ICompressorProps>["onSetRelease"] = (value) =>
    clamp(value, 0, 1);

  onAfterSetRelease: SetterHooks<ICompressorProps>["onAfterSetRelease"] = (
    value,
  ) => {
    this.compressorNode.release.value = value;
  };

  onSetMakeup: SetterHooks<ICompressorProps>["onSetMakeup"] = (value) =>
    clamp(value, -24, 24);

  onAfterSetMakeup: SetterHooks<ICompressorProps>["onAfterSetMakeup"] = (
    value,
  ) => {
    this.makeupNode.gain.value = decibelsToGain(value);
  };

  onSetMix: SetterHooks<ICompressorProps>["onSetMix"] = (value) =>
    clamp(value, 0, 1);

  onAfterSetMix: SetterHooks<ICompressorProps>["onAfterSetMix"] = (value) => {
    this.wetDryMixer.setMix(value);
  };
}
