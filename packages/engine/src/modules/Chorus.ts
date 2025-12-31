import { Context } from "@blibliki/utils";
import { GainNode } from "@blibliki/utils/web-audio-api";
import { ModulePropSchema } from "@/core";
import { IModule, Module, SetterHooks } from "@/core/module/Module";
import { WetDryMixer } from "@/utils";
import { ICreateModule, ModuleType } from ".";

export type IChorusProps = {
  rate: number; // 0.1-10 Hz (LFO frequency)
  depth: number; // 0-1 (modulation depth)
  mix: number; // 0-1 (dry/wet blend)
  feedback: number; // 0-0.95 (feedback amount)
};

export type IChorus = IModule<ModuleType.Chorus>;

export const chorusPropSchema: ModulePropSchema<IChorusProps> = {
  rate: {
    kind: "number",
    min: 0.1,
    max: 10,
    step: 0.1,
    exp: 2, // Exponential scaling for better low-frequency control
    label: "Rate",
  },
  depth: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Depth",
  },
  mix: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Mix",
  },
  feedback: {
    kind: "number",
    min: 0,
    max: 0.95,
    step: 0.01,
    label: "Feedback",
  },
};

const DEFAULT_PROPS: IChorusProps = {
  rate: 0.5, // 0.5 Hz (slow modulation)
  depth: 0.5, // Medium depth
  mix: 0.5, // 50/50 blend
  feedback: 0.2, // Subtle feedback
};

export default class Chorus
  extends Module<ModuleType.Chorus>
  implements
    Pick<
      SetterHooks<IChorusProps>,
      | "onAfterSetRate"
      | "onAfterSetDepth"
      | "onAfterSetMix"
      | "onAfterSetFeedback"
    >
{
  declare audioNode: GainNode; // Input node (inherited from Module)
  private outputNode: GainNode; // Final output from mixer
  private feedbackGain: GainNode; // Feedback amount
  private delayLeft: DelayNode; // First chorus voice
  private delayRight: DelayNode; // Second chorus voice
  private lfoLeft: OscillatorNode; // LFO for left voice
  private lfoRight: OscillatorNode; // LFO for right voice
  private depthLeft: GainNode; // Modulation depth for left
  private depthRight: GainNode; // Modulation depth for right
  private merger: ChannelMergerNode; // Combine to stereo
  private wetDryMixer: WetDryMixer; // Wet/dry blending
  private rateModGain: GainNode; // External rate modulation input

  constructor(engineId: string, params: ICreateModule<ModuleType.Chorus>) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    const audioNodeConstructor = (context: Context) =>
      new GainNode(context.audioContext, { gain: 1 });

    super(engineId, {
      ...params,
      audioNodeConstructor,
      props,
    });

    // Create audio nodes
    const audioContext = this.context.audioContext;

    this.feedbackGain = audioContext.createGain();
    this.delayLeft = audioContext.createDelay(0.1); // Max 0.1s delay
    this.delayRight = audioContext.createDelay(0.1);
    this.lfoLeft = audioContext.createOscillator();
    this.lfoRight = audioContext.createOscillator();
    this.depthLeft = audioContext.createGain();
    this.depthRight = audioContext.createGain();
    this.merger = audioContext.createChannelMerger(2);
    this.wetDryMixer = new WetDryMixer(this.context);
    this.rateModGain = audioContext.createGain();

    // Configure LFOs
    this.lfoLeft.type = "sine";
    this.lfoRight.type = "sine";

    // Connect audio graph
    // Dry path
    this.wetDryMixer.connectInput(this.audioNode);

    // Rate modulation input connects to both LFO frequencies
    this.rateModGain.connect(this.lfoLeft.frequency);
    this.rateModGain.connect(this.lfoRight.frequency);

    // LFO modulation to delay times
    this.lfoLeft.connect(this.depthLeft);
    this.depthLeft.connect(this.delayLeft.delayTime);
    this.lfoRight.connect(this.depthRight);
    this.depthRight.connect(this.delayRight.delayTime);

    // Wet path with feedback
    this.audioNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayLeft);
    this.feedbackGain.connect(this.delayRight);

    // Delays to merger (stereo)
    this.delayLeft.connect(this.merger, 0, 0); // Left channel
    this.delayRight.connect(this.merger, 0, 1); // Right channel

    // Feedback loop
    this.merger.connect(this.feedbackGain);

    // Merger to wet path
    this.merger.connect(this.wetDryMixer.getWetInput());

    // Output
    this.outputNode = this.wetDryMixer.getOutput();

    // Apply initial parameters
    // Base delay time: 20ms typical for chorus
    this.delayLeft.delayTime.value = 0.02;
    this.delayRight.delayTime.value = 0.02;

    // Set LFO frequency (rate)
    this.lfoLeft.frequency.value = props.rate;
    this.lfoRight.frequency.value = props.rate;

    // Depth: convert (0-1) to seconds (0-0.01s = 0-10ms modulation)
    const depthInSeconds = props.depth * 0.01;
    this.depthLeft.gain.value = depthInSeconds;
    this.depthRight.gain.value = depthInSeconds;

    // Feedback
    this.feedbackGain.gain.value = props.feedback;

    // Mix
    this.wetDryMixer.setMix(props.mix);

    // Start oscillators with phase offset for stereo width
    const now = this.context.audioContext.currentTime;
    this.lfoLeft.start(now);
    // Start right LFO with 180° phase offset (half period)
    const phaseOffset = 1 / (2 * props.rate);
    this.lfoRight.start(now + phaseOffset);

    // Register IOs
    this.registerDefaultIOs("in");
    this.registerAdditionalInputs();
    this.registerCustomOutput();
  }

  private registerAdditionalInputs() {
    // External rate modulation input
    this.registerAudioInput({
      name: "rate",
      getAudioNode: () => this.rateModGain,
    });
  }

  private registerCustomOutput() {
    this.registerAudioOutput({
      name: "out",
      getAudioNode: () => this.outputNode,
    });
  }

  onAfterSetRate: SetterHooks<IChorusProps>["onAfterSetRate"] = (value) => {
    this.lfoLeft.frequency.value = value;
    this.lfoRight.frequency.value = value;
    // Note: Phase offset maintained by start time, not adjustable at runtime
  };

  onAfterSetDepth: SetterHooks<IChorusProps>["onAfterSetDepth"] = (value) => {
    const depthInSeconds = value * 0.01; // Convert to 0-10ms range
    this.depthLeft.gain.value = depthInSeconds;
    this.depthRight.gain.value = depthInSeconds;
  };

  onAfterSetMix: SetterHooks<IChorusProps>["onAfterSetMix"] = (value) => {
    this.wetDryMixer.setMix(value);
  };

  onAfterSetFeedback: SetterHooks<IChorusProps>["onAfterSetFeedback"] = (
    value,
  ) => {
    const cappedValue = Math.min(value, 0.95); // Prevent runaway feedback
    this.feedbackGain.gain.value = cappedValue;
  };

  dispose() {
    try {
      this.lfoLeft.stop();
      this.lfoRight.stop();
    } catch {
      // Ignore errors if already stopped
    }
    super.dispose();
  }
}
