import { Division, divisionToMilliseconds } from "@blibliki/transport";
import { Context } from "@blibliki/utils";
import { EnumProp, ModulePropSchema } from "@/core";
import { Module, SetterHooks } from "@/core/module/Module";
import { WetDryMixer } from "@/utils";
import { ICreateModule, ModuleType } from ".";

export enum DelayTimeMode {
  short = "short",
  long = "long",
}

export type IDelayProps = {
  time: number; // 0-2000 ms (short) or 0-5000 ms (long)
  timeMode: DelayTimeMode; // short (2s) or long (5s)
  sync: boolean; // Enable BPM sync
  division: Division; // Note division when sync is enabled
  feedback: number; // 0-0.95 (feedback amount)
  mix: number; // 0-1 (dry/wet)
  stereo: boolean; // Enable ping-pong stereo mode
};

export type IDelay = Module<ModuleType.Delay>;

const NOTE_DIVISIONS: Division[] = [
  "1/64",
  "1/48",
  "1/32",
  "1/24",
  "1/16",
  "1/12",
  "1/8",
  "1/6",
  "3/16",
  "1/4",
  "5/16",
  "1/3",
  "3/8",
  "1/2",
  "3/4",
  "1",
  "1.5",
  "2",
  "3",
  "4",
  "6",
  "8",
  "16",
  "32",
];

export const delayPropSchema: ModulePropSchema<
  IDelayProps,
  {
    timeMode: EnumProp<DelayTimeMode>;
    division: EnumProp<Division>;
  }
> = {
  time: {
    kind: "number",
    min: 0,
    max: 5000, // UI max for manual mode (long = 5s)
    step: 1,
    label: "Delay Time",
  },
  timeMode: {
    kind: "enum",
    options: [DelayTimeMode.short, DelayTimeMode.long],
    label: "Time Mode",
  },
  sync: {
    kind: "boolean",
    label: "Sync",
  },
  division: {
    kind: "enum",
    options: NOTE_DIVISIONS,
    label: "Division",
  },
  feedback: {
    kind: "number",
    min: 0,
    max: 0.95,
    step: 0.01,
    label: "Feedback",
  },
  mix: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Mix",
  },
  stereo: {
    kind: "boolean",
    label: "Stereo",
  },
};

const DEFAULT_DELAY_PROPS: IDelayProps = {
  time: 250,
  timeMode: DelayTimeMode.short,
  sync: false,
  division: "1/4",
  feedback: 0.3,
  mix: 0.3,
  stereo: false,
};

const SHORT_MODE_MAX_DELAY_SECONDS = 2;
const LONG_MODE_MAX_DELAY_SECONDS = 5;
const ABSOLUTE_MAX_DELAY_SECONDS = 179; // Web Audio API limit: must be < 180s
const DELAY_CAPACITY_HEADROOM_SECONDS = 0.05;
const MIN_DELAY_CAPACITY_SECONDS = 0.1;

// ============================================================================
// Module Class
// ============================================================================

export default class Delay
  extends Module<ModuleType.Delay>
  implements
    Pick<
      SetterHooks<IDelayProps>,
      | "onAfterSetTime"
      | "onAfterSetTimeMode"
      | "onAfterSetSync"
      | "onAfterSetDivision"
      | "onAfterSetFeedback"
      | "onAfterSetMix"
      | "onAfterSetStereo"
    >
{
  // Audio graph nodes
  declare audioNode: GainNode; // Input node
  private outputNode!: GainNode; // Final output node
  private wetDryMixer: WetDryMixer;

  // Mono delay nodes
  private delayNode: DelayNode;
  private feedbackGain: GainNode;
  private delayCapacitySeconds: number;

  // Stereo ping-pong nodes (created when stereo=true)
  private delayLeft: DelayNode | null = null;
  private delayRight: DelayNode | null = null;
  private feedbackLeft: GainNode | null = null;
  private feedbackRight: GainNode | null = null;
  private merger: ChannelMergerNode | null = null;

  constructor(engineId: string, params: ICreateModule<ModuleType.Delay>) {
    const props = { ...DEFAULT_DELAY_PROPS, ...params.props };

    // Input node
    const audioNodeConstructor = (context: Context) =>
      context.audioContext.createGain();

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    // Set input gain
    this.audioNode.gain.value = 1;

    // Create WetDryMixer
    this.wetDryMixer = new WetDryMixer(this.context);

    // Allocate only the delay capacity we currently need.
    const initialDelayTime = this.getRequestedDelayTimeSeconds(props);
    const initialCapacity = this.getDelayCapacitySeconds(
      initialDelayTime,
      props,
    );
    this.delayCapacitySeconds = initialCapacity;
    this.delayNode = this.context.audioContext.createDelay(initialCapacity);
    this.feedbackGain = this.context.audioContext.createGain();

    // Connect mono graph initially
    this.connectMonoGraph();

    // Apply initial parameters
    this.wetDryMixer.setMix(props.mix);
    this.feedbackGain.gain.value = props.feedback;
    this.updateDelayTime();

    // Switch to stereo if needed
    if (props.stereo) {
      this.switchToStereo();
    }

    // Setup BPM listener for sync mode
    this.setupBPMListener();

    this.registerDefaultIOs("in");
    this.registerCustomOutput();
  }

  private setupBPMListener() {
    this.engine.transport.addPropertyChangeCallback("bpm", () => {
      if (!this.props.sync) return;

      this.updateDelayTime();
    });
  }

  private getManualModeMaxDelaySeconds(props: IDelayProps = this.props) {
    return props.timeMode === DelayTimeMode.short
      ? SHORT_MODE_MAX_DELAY_SECONDS
      : LONG_MODE_MAX_DELAY_SECONDS;
  }

  private getRequestedDelayTimeSeconds(props: IDelayProps = this.props) {
    if (props.sync) {
      const bpm = this.engine.transport.bpm;
      const timeMs = divisionToMilliseconds(props.division, bpm);
      return Math.max(0, timeMs / 1000);
    }

    return Math.max(0, props.time / 1000);
  }

  private getDelayCapacitySeconds(
    requestedDelaySeconds: number,
    props: IDelayProps = this.props,
  ) {
    const manualModeMax = this.getManualModeMaxDelaySeconds(props);
    const target = props.sync
      ? requestedDelaySeconds
      : Math.max(manualModeMax, requestedDelaySeconds);

    return Math.min(
      ABSOLUTE_MAX_DELAY_SECONDS,
      Math.max(
        MIN_DELAY_CAPACITY_SECONDS,
        target + DELAY_CAPACITY_HEADROOM_SECONDS,
      ),
    );
  }

  private createStereoNodes(delayCapacitySeconds: number) {
    this.delayLeft =
      this.context.audioContext.createDelay(delayCapacitySeconds);
    this.delayRight =
      this.context.audioContext.createDelay(delayCapacitySeconds);
    this.feedbackLeft = this.context.audioContext.createGain();
    this.feedbackRight = this.context.audioContext.createGain();
    this.merger ??= this.context.audioContext.createChannelMerger(2);
  }

  private rebuildDelayGraph(delayCapacitySeconds: number) {
    this.disconnectAll();

    this.delayCapacitySeconds = delayCapacitySeconds;
    this.delayNode =
      this.context.audioContext.createDelay(delayCapacitySeconds);
    this.feedbackGain = this.context.audioContext.createGain();

    if (this.props.stereo) {
      this.createStereoNodes(delayCapacitySeconds);
      this.connectStereoGraph();
    } else {
      this.delayLeft = null;
      this.delayRight = null;
      this.feedbackLeft = null;
      this.feedbackRight = null;
      this.connectMonoGraph();
    }

    this.onAfterSetFeedback(this.props.feedback);
    this.wetDryMixer.setMix(this.props.mix);
  }

  private ensureDelayCapacity(requestedDelaySeconds: number) {
    const requiredCapacity = this.getDelayCapacitySeconds(
      requestedDelaySeconds,
    );
    if (requiredCapacity <= this.delayCapacitySeconds) return;
    this.rebuildDelayGraph(requiredCapacity);
  }

  private applyDelayTime(seconds: number) {
    this.delayNode.delayTime.value = seconds;
    if (this.delayLeft) this.delayLeft.delayTime.value = seconds;
    if (this.delayRight) this.delayRight.delayTime.value = seconds;
  }

  private updateDelayTime() {
    const requestedTime = this.getRequestedDelayTimeSeconds();
    this.ensureDelayCapacity(requestedTime);

    const maxDelayTime = this.delayCapacitySeconds;
    const clampedTime = Math.min(requestedTime, maxDelayTime);
    this.applyDelayTime(clampedTime);
  }

  private connectMonoGraph() {
    // Disconnect any existing connections
    this.disconnectAll();

    // Connect: Input -> WetDryMixer (dry)
    this.wetDryMixer.connectInput(this.audioNode);

    // Connect: Input -> Delay -> Feedback -> Delay (loop)
    this.audioNode.connect(this.delayNode);
    this.delayNode.connect(this.feedbackGain);
    this.feedbackGain.connect(this.delayNode); // Feedback loop

    // Connect: Delay -> WetDryMixer (wet)
    this.delayNode.connect(this.wetDryMixer.getWetInput());

    // Output
    this.outputNode = this.wetDryMixer.getOutput();
  }

  private connectStereoGraph() {
    this.disconnectAll();

    if (
      !this.delayLeft ||
      !this.delayRight ||
      !this.feedbackLeft ||
      !this.feedbackRight ||
      !this.merger
    ) {
      return;
    }

    this.wetDryMixer.connectInput(this.audioNode);

    this.audioNode.connect(this.delayLeft);

    this.delayLeft.connect(this.merger, 0, 0); // Left to channel 0

    this.delayLeft.connect(this.feedbackRight);
    this.feedbackRight.connect(this.delayRight);

    this.delayRight.connect(this.merger, 0, 1); // Right to channel 1

    this.delayRight.connect(this.feedbackLeft);
    this.feedbackLeft.connect(this.delayLeft);

    this.merger.connect(this.wetDryMixer.getWetInput());

    this.outputNode = this.wetDryMixer.getOutput();

    this.delayLeft.delayTime.value = this.delayNode.delayTime.value;
    this.delayRight.delayTime.value = this.delayNode.delayTime.value;
    this.feedbackLeft.gain.value = this.feedbackGain.gain.value;
    this.feedbackRight.gain.value = this.feedbackGain.gain.value;
  }

  private switchToStereo() {
    const delayCapacity = this.delayCapacitySeconds;
    const needsStereoNodes =
      !this.delayLeft ||
      !this.delayRight ||
      !this.feedbackLeft ||
      !this.feedbackRight;

    if (needsStereoNodes) {
      this.createStereoNodes(delayCapacity);
    }

    this.connectStereoGraph();
  }

  private disconnectAll() {
    try {
      this.audioNode.disconnect();
      this.delayNode.disconnect();
      this.feedbackGain.disconnect();
      if (this.delayLeft) this.delayLeft.disconnect();
      if (this.delayRight) this.delayRight.disconnect();
      if (this.feedbackLeft) this.feedbackLeft.disconnect();
      if (this.feedbackRight) this.feedbackRight.disconnect();
      if (this.merger) this.merger.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }

  private registerCustomOutput() {
    this.registerAudioOutput({
      name: "out",
      getAudioNode: () => this.outputNode,
    });
  }

  // ============================================================================
  // SetterHooks
  // ============================================================================

  onAfterSetTime = (_value: number) => {
    if (this.props.sync) return;

    this.updateDelayTime();
  };

  onAfterSetTimeMode = (value: DelayTimeMode) => {
    // Clamp time if it exceeds the new mode's maximum
    const maxTime = value === DelayTimeMode.short ? 2000 : 5000;
    if (this.props.time > maxTime) {
      this.props = { time: maxTime };
    }
  };

  onAfterSetSync = (_value: boolean) => {
    this.updateDelayTime();
  };

  onAfterSetDivision = (_value: Division) => {
    if (this.props.sync) {
      this.updateDelayTime();
    }
  };

  onAfterSetFeedback = (value: number) => {
    // Cap at 0.95 to prevent runaway feedback
    const cappedValue = Math.min(value, 0.95);
    this.feedbackGain.gain.value = cappedValue;
    if (this.feedbackLeft) this.feedbackLeft.gain.value = cappedValue;
    if (this.feedbackRight) this.feedbackRight.gain.value = cappedValue;
  };

  onAfterSetMix = (value: number) => {
    this.wetDryMixer.setMix(value);
  };

  onAfterSetStereo = (value: boolean) => {
    if (value) {
      this.switchToStereo();
    } else {
      this.connectMonoGraph();
    }
  };
}
