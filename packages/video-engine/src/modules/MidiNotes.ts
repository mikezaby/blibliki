import {
  ControlValues,
  Frame,
  ICreateVideoModule,
  IOPort,
  MidiNoteEvent,
  VideoModule,
} from "@/core/Module";
import {
  DEFAULT_INSTANCES_PROPS,
  IInstancesProps,
  instancesPropSchema,
} from "@/core/instances";
import { AudioModuleProp, ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IMidiNotesProps = IInstancesProps & { moduleId: string };

const DEFAULT_PROPS: IMidiNotesProps = {
  moduleId: "",
  ...DEFAULT_INSTANCES_PROPS,
};

export const midiNotesPropSchema: ModulePropSchema<
  IMidiNotesProps,
  { moduleId: AudioModuleProp }
> = {
  ...instancesPropSchema,
  moduleId: {
    kind: "audioModule",
    label: "MIDI from",
    shortLabel: "midi",
  },
};

type Instance = {
  note: number;
  velocity: number;
  gate: number;
  startedAt: number;
};

const silent = (): Instance => ({
  note: 0,
  velocity: 0,
  gate: 0,
  startedAt: -1,
});

// Allocates the notes of one audio module's MIDI output to instances the way
// the audio engine's VoiceScheduler does: a note already held retriggers
// its instance, else the lowest free instance, else the instance that started
// earliest. Per instance: gate 0/1, note 0..127, velocity 0..1. A released
// instance keeps its note and velocity through the release.
// ponytail: a stolen instance keeps its gate up, so an Envelope on it does
// not retrigger; a trigger output that pulses for a frame would fix that.
export default class MidiNotes extends VideoModule<VideoModuleType.MidiNotes> {
  readonly inputs = [] as const;
  readonly outputs: readonly IOPort[] = [
    { name: "gate", kind: "control" },
    { name: "note", kind: "control" },
    { name: "velocity", kind: "control" },
  ];
  readonly schema = midiNotesPropSchema;
  private instances: Instance[] = [];
  private events = 0;

  constructor(params: ICreateVideoModule<VideoModuleType.MidiNotes>) {
    super(VideoModuleType.MidiNotes, DEFAULT_PROPS, params);
  }

  onMidi(sourceId: string, event: MidiNoteEvent) {
    if (sourceId !== this.props.moduleId) return;
    const count = Math.max(1, Math.round(this.props.instances));
    while (this.instances.length < count) this.instances.push(silent());
    this.instances.length = count;
    this.events += 1;

    const holding = this.instances.findIndex(
      (v) => v.gate === 1 && v.note === event.note,
    );
    if (event.type === "noteOff") {
      const instance = this.instances[holding];
      if (instance) instance.gate = 0;
      return;
    }

    let index = holding;
    if (index < 0) index = this.instances.findIndex((v) => v.gate === 0);
    if (index < 0) {
      index = 0;
      this.instances.forEach((v, i) => {
        if (v.startedAt < (this.instances[index]?.startedAt ?? Infinity)) {
          index = i;
        }
      });
    }
    this.instances[index] = {
      note: event.note,
      velocity: event.velocity,
      gate: 1,
      startedAt: this.events,
    };
  }

  tick(
    _values: ControlValues,
    _frame: Frame,
    _props = this.props,
    instance = 0,
  ) {
    const { gate, note, velocity } = this.instances[instance] ?? silent();

    return { gate, note, velocity };
  }
}
