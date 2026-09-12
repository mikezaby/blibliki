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
  instancesProp,
  instancesPropSchema,
} from "@/core/instances";
import { ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IMidiNotesProps = IInstancesProps;

const DEFAULT_PROPS: IMidiNotesProps = { ...DEFAULT_INSTANCES_PROPS };

export const midiNotesPropSchema: ModulePropSchema<IMidiNotesProps> = {
  ...instancesPropSchema,
};

type Slot = { gate: number; note: number; velocity: number };

const silent = (): Slot => ({ gate: 0, note: 0, velocity: 0 });

// Turns the notes reaching each instance into control values: gate 0/1,
// note 0..127, velocity 0..1. An untagged note (no Voice Scheduler before
// the cable) lands on instance 0, as an untagged audio event goes to voice
// 0.
// A released instance keeps its note and velocity through the release.
// ponytail: a note for an instance this module does not have is dropped,
// where the audio engine throws.
export default class MidiNotes extends VideoModule<VideoModuleType.MidiNotes> {
  readonly inputs = [{ name: "in", kind: "midi" }] as const;
  readonly outputs: readonly IOPort[] = [
    { name: "gate", kind: "control" },
    { name: "note", kind: "control" },
    { name: "velocity", kind: "control" },
  ];
  readonly schema = midiNotesPropSchema;
  private slots: Slot[] = [];

  constructor(params: ICreateVideoModule<VideoModuleType.MidiNotes>) {
    super(VideoModuleType.MidiNotes, DEFAULT_PROPS, params);
  }

  receiveMidi(_ioName: string, event: MidiNoteEvent) {
    const instance = event.instance ?? 0;
    if (instance >= instancesProp(this.props)) return;
    const slot = (this.slots[instance] ??= silent());
    if (event.type === "noteOn") {
      slot.gate = 1;
      slot.note = event.note;
      slot.velocity = event.velocity;
    } else if (slot.note === event.note) {
      slot.gate = 0;
    }
  }

  tick(
    _values: ControlValues,
    _frame: Frame,
    _props = this.props,
    instance = 0,
  ) {
    const { gate, note, velocity } = this.slots[instance] ?? silent();

    return { gate, note, velocity };
  }
}
