import { TPB } from "@blibliki/transport";
import { Context } from "@blibliki/utils";
import { EnumProp, ModulePropSchema } from "@/core";
import { Module, SetterHooks } from "@/core/module/Module";
import { WetDryMixer } from "@/utils";
import { ICreateModule, ModuleType, NOTE_DIVISIONS, NoteDivision } from ".";

// ============================================================================
// Types
// ============================================================================

export enum DelayTimeMode {
  short = "short",
  long = "long",
}

export type IDelayProps = {
  time: number; // 0-2000 ms (short) or 0-5000 ms (long)
  timeMode: DelayTimeMode; // short (2s) or long (5s)
  sync: boolean; // Enable BPM sync
  division: NoteDivision; // Note division when sync is enabled
  feedback: number; // 0-0.95 (feedback amount)
  mix: number; // 0-1 (dry/wet)
  stereo: boolean; // Enable ping-pong stereo mode
};

export type IDelay = Module<ModuleType.Delay>;

// Map note divisions to ticks (from LFO module)
const DIVISION_TO_TICKS: Record<NoteDivision, number> = {
  "1/64": TPB / 16,
  "1/48": TPB / 12,
  "1/32": TPB / 8,
  "1/24": TPB / 6,
  "1/16": TPB / 4,
  "1/12": TPB / 3,
  "1/8": TPB / 2,
  "1/6": (TPB * 2) / 3,
  "3/16": (TPB * 3) / 4,
  "1/4": TPB,
  "5/16": (TPB * 5) / 4,
  "1/3": (TPB * 4) / 3,
  "3/8": (TPB * 3) / 2,
  "1/2": TPB * 2,
  "3/4": TPB * 3,
  "1": TPB * 4,
  "1.5": TPB * 6,
  "2": TPB * 8,
  "3": TPB * 12,
  "4": TPB * 16,
  "6": TPB * 24,
  "8": TPB * 32,
  "16": TPB * 64,
  "32": TPB * 128,
};

function divisionToMilliseconds(division: NoteDivision, bpm: number): number {
  const ticksPerDivision = DIVISION_TO_TICKS[division];
  const beatsPerDivision = ticksPerDivision / TPB;
  const secondsPerDivision = beatsPerDivision * (60 / bpm);
  return secondsPerDivision * 1000;
}

// ============================================================================
// Schema
// ============================================================================

export const delayPropSchema: ModulePropSchema<
  IDelayProps,
  {
    timeMode: EnumProp<DelayTimeMode>;
    division: EnumProp<NoteDivision>;
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

    // Create mono delay graph (default)
    // Max 179s (Web Audio API limit: must be < 180s / 3 minutes)
    this.delayNode = this.context.audioContext.createDelay(179);
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
    this.engine.transport.addClockCallback(() => {
      if (this.props.sync) {
        this.updateDelayTime();
      }
    });
  }

  private updateDelayTime() {
    let timeInSeconds: number;

    if (this.props.sync) {
      // BPM-based timing
      const bpm = this.engine.transport.bpm;
      const timeMs = divisionToMilliseconds(this.props.division, bpm);
      timeInSeconds = timeMs / 1000;
    } else {
      // Manual timing
      timeInSeconds = this.props.time / 1000;
    }

    this.delayNode.delayTime.value = timeInSeconds;
    if (this.delayLeft) this.delayLeft.delayTime.value = timeInSeconds;
    if (this.delayRight) this.delayRight.delayTime.value = timeInSeconds;
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

  private switchToStereo() {
    if (!this.delayLeft) {
      // Create stereo nodes (max 179s - Web Audio API limit: < 180s)
      this.delayLeft = this.context.audioContext.createDelay(179);
      this.delayRight = this.context.audioContext.createDelay(179);
      this.feedbackLeft = this.context.audioContext.createGain();
      this.feedbackRight = this.context.audioContext.createGain();
      this.merger = this.context.audioContext.createChannelMerger(2);
    }

    // Disconnect mono graph
    this.disconnectAll();

    // Connect stereo ping-pong graph
    this.wetDryMixer.connectInput(this.audioNode);

    // Input -> DelayLeft
    this.audioNode.connect(this.delayLeft);

    // DelayLeft -> Output to left channel
    this.delayLeft.connect(this.merger!, 0, 0); // Left to channel 0

    // DelayLeft -> FeedbackRight -> DelayRight (ping-pong to right)
    this.delayLeft.connect(this.feedbackRight!);
    this.feedbackRight!.connect(this.delayRight!);

    // DelayRight -> Output to right channel
    this.delayRight!.connect(this.merger!, 0, 1); // Right to channel 1

    // DelayRight -> FeedbackLeft -> DelayLeft (ping-pong back to left)
    this.delayRight!.connect(this.feedbackLeft!);
    this.feedbackLeft!.connect(this.delayLeft);

    // Merger -> WetDryMixer (wet)
    this.merger!.connect(this.wetDryMixer.getWetInput());

    this.outputNode = this.wetDryMixer.getOutput();

    // Sync delay times and feedback gains
    this.delayLeft.delayTime.value = this.delayNode.delayTime.value;
    this.delayRight!.delayTime.value = this.delayNode.delayTime.value;
    this.feedbackLeft!.gain.value = this.feedbackGain.gain.value;
    this.feedbackRight!.gain.value = this.feedbackGain.gain.value;
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
    if (!this.props.sync) {
      this.updateDelayTime();
    }
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

  onAfterSetDivision = (_value: NoteDivision) => {
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
