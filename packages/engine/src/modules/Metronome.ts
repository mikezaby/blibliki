import {
  ContextTime,
  MetronomeSource,
  MetronomeSourceEvent,
} from "@blibliki/transport";
import { Context } from "@blibliki/utils";
import { GainNode, OscillatorNode } from "@blibliki/utils/web-audio-api";
import { IModule, Module, ModulePropSchema } from "@/core";
import { ICreateModule, ModuleType } from ".";

export type IMetronome = IModule<ModuleType.Metronome>;

export type IMetronomeProps = {
  enabled: boolean;
};

export const metronomePropSchema: ModulePropSchema<IMetronomeProps> = {
  enabled: {
    kind: "boolean",
    label: "Enabled",
    shortLabel: "on",
  },
};

const DEFAULT_PROPS: IMetronomeProps = {
  enabled: false,
};

const CLICK_SECONDS = 0.04;
const CLICK_GAIN = 0.4;
const DOWNBEAT_HZ = 1600;
const BEAT_HZ = 1000;
// Room for the first click to be scheduled ahead of the audio thread.
const COUNT_IN_LEAD_SECONDS = 0.05;

// A click on every beat while the transport runs, and a count-in on demand.
export default class Metronome extends Module<ModuleType.Metronome> {
  declare audioNode: GainNode;
  private source: MetronomeSource;

  constructor(engineId: string, params: ICreateModule<ModuleType.Metronome>) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const audioNodeConstructor = (context: Context) =>
      new GainNode(context.audioContext, { gain: 1 });

    super(engineId, { ...params, props, audioNodeConstructor });

    this.registerDefaultIOs("out");
    this.source = new MetronomeSource(this.engine.transport, this.onBeat);
    this.engine.transport.addSource(this.source);
  }

  // Clicks through `bars` bars from now, whether or not the metronome is on,
  // and returns the moment after them, for the transport to start at.
  countIn(bars: number): ContextTime {
    const [beatsPerBar, denominator] = this.engine.transport.timeSignature;
    const secondsPerBeat = (60 / this.engine.bpm) * (4 / denominator);
    const startAt = this.context.currentTime + COUNT_IN_LEAD_SECONDS;
    const beats = bars * beatsPerBar;

    for (let beat = 0; beat < beats; beat += 1) {
      this.click(startAt + beat * secondsPerBeat, beat % beatsPerBar === 0);
    }

    return startAt + beats * secondsPerBeat;
  }

  dispose() {
    this.engine.transport.removeSource(this.source.id);
  }

  private onBeat = (event: MetronomeSourceEvent) => {
    if (!this.props.enabled) return;

    this.click(event.contextTime, event.beat === 0);
  };

  private click(at: ContextTime, downbeat: boolean) {
    const context = this.context.audioContext;
    const oscillator = new OscillatorNode(context, {
      frequency: downbeat ? DOWNBEAT_HZ : BEAT_HZ,
    });
    const envelope = new GainNode(context, { gain: 0 });

    envelope.gain.setValueAtTime(CLICK_GAIN, at);
    envelope.gain.exponentialRampToValueAtTime(0.001, at + CLICK_SECONDS);
    oscillator.connect(envelope);
    envelope.connect(this.audioNode);
    oscillator.start(at);
    oscillator.stop(at + CLICK_SECONDS);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }
}
