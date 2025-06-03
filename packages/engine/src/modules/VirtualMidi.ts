import { PropSchema, Module, IModule, MidiOutput, Note } from "@/core";
import { TTime } from "@/core/Timing/Time";
import MidiEvent from "@/core/midi/MidiEvent";
import { ICreateModule, ModuleType } from ".";

export type IVirtualMidi = IModule<ModuleType.VirtualMidi>;
export type IVirtualMidiProps = {
  activeNotes: string[];
};

export const virtualMidiPropSchema: PropSchema<IVirtualMidiProps> = {
  activeNotes: {
    kind: "array",
    label: "Active notes",
  },
};

const DEFAULT_PROPS: IVirtualMidiProps = { activeNotes: [] };

export default class VirtualMidi extends Module<ModuleType.VirtualMidi> {
  declare audioNode: undefined;
  midiOutput!: MidiOutput;

  constructor(engineId: string, params: ICreateModule<ModuleType.VirtualMidi>) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    super(engineId, {
      ...params,
      props,
    });

    this.registerInputs();
    this.registerOutputs();
  }

  sendMidi(midiEvent: MidiEvent) {
    this.midiOutput.onMidiEvent(midiEvent);
  }

  triggerAttack = (note: Note, triggerAttack: TTime) => {
    this.props = { activeNotes: [...this.props.activeNotes, note.fullName] };
    this.triggerPropsUpdate();
    this.sendMidi(MidiEvent.fromNote(note, true, triggerAttack));
  };

  triggerRelease = (note: Note, triggerAttack: TTime) => {
    this.props = {
      activeNotes: this.props.activeNotes.filter(
        (name) => name !== note.fullName,
      ),
    };
    this.triggerPropsUpdate();
    this.sendMidi(MidiEvent.fromNote(note, false, triggerAttack));
  };

  private registerInputs() {
    this.registerMidiInput({
      name: "midi in",
      onMidiEvent: this.onMidiEvent,
    });
  }

  private registerOutputs() {
    this.midiOutput = this.registerMidiOutput({ name: "midi out" });
  }
}
