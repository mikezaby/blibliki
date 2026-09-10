import {
  ControlValues,
  Frame,
  ICreateVideoModule,
  IOPort,
  MidiNoteEvent,
  VideoModule,
} from "@/core/Module";
import { DEFAULT_POLY_PROPS, IPolyProps, polyPropSchema } from "@/core/poly";
import { AudioModuleProp, ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IMidiVoicesProps = IPolyProps & { moduleId: string };

const DEFAULT_PROPS: IMidiVoicesProps = { moduleId: "", ...DEFAULT_POLY_PROPS };

export const midiVoicesPropSchema: ModulePropSchema<
  IMidiVoicesProps,
  { moduleId: AudioModuleProp }
> = {
  ...polyPropSchema,
  moduleId: {
    kind: "audioModule",
    label: "MIDI from",
    shortLabel: "midi",
  },
};

type Voice = {
  note: number;
  velocity: number;
  gate: number;
  startedAt: number;
};

const silent = (): Voice => ({ note: 0, velocity: 0, gate: 0, startedAt: -1 });

// Allocates the notes of one audio module's MIDI output to voices the way
// the audio engine's VoiceScheduler does: a note already held retriggers
// its voice, else the lowest free voice, else the voice that started
// earliest. Per voice: gate 0/1, note 0..127, velocity 0..1. A released
// voice keeps its note and velocity through the release.
// ponytail: a stolen voice keeps its gate up, so an Envelope on it does
// not retrigger; a trigger output that pulses for a frame would fix that.
export default class MidiVoices extends VideoModule<VideoModuleType.MidiVoices> {
  readonly inputs = [] as const;
  readonly outputs: readonly IOPort[] = [
    { name: "gate", kind: "control" },
    { name: "note", kind: "control" },
    { name: "velocity", kind: "control" },
  ];
  readonly schema = midiVoicesPropSchema;
  private voices: Voice[] = [];
  private events = 0;

  constructor(params: ICreateVideoModule<VideoModuleType.MidiVoices>) {
    super(VideoModuleType.MidiVoices, DEFAULT_PROPS, params);
  }

  onMidi(sourceId: string, event: MidiNoteEvent) {
    if (sourceId !== this.props.moduleId) return;
    const count = Math.max(1, Math.round(this.props.voices));
    while (this.voices.length < count) this.voices.push(silent());
    this.voices.length = count;
    this.events += 1;

    const holding = this.voices.findIndex(
      (v) => v.gate === 1 && v.note === event.note,
    );
    if (event.type === "noteOff") {
      const voice = this.voices[holding];
      if (voice) voice.gate = 0;
      return;
    }

    let index = holding;
    if (index < 0) index = this.voices.findIndex((v) => v.gate === 0);
    if (index < 0) {
      index = 0;
      this.voices.forEach((v, i) => {
        if (v.startedAt < (this.voices[index]?.startedAt ?? Infinity)) {
          index = i;
        }
      });
    }
    this.voices[index] = {
      note: event.note,
      velocity: event.velocity,
      gate: 1,
      startedAt: this.events,
    };
  }

  tick(_values: ControlValues, _frame: Frame, _props = this.props, voice = 0) {
    const { gate, note, velocity } = this.voices[voice] ?? silent();

    return { gate, note, velocity };
  }
}
