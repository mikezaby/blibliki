import { IModule, Module, MidiOutput } from "@/core";
import MidiEvent from "@/core/midi/MidiEvent";
import { PropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

export type IMidiSelector = IModule<ModuleType.MidiSelector>;
export type IMidiSelectorProps = {
  selectedId: string | undefined | null;
};

export const midiSelectorPropSchema: PropSchema<IMidiSelectorProps> = {
  selectedId: {
    kind: "string",
    label: "Midi device ID",
  },
};

const DEFAULT_PROPS: IMidiSelectorProps = { selectedId: undefined };

export default class MidiSelector extends Module<ModuleType.MidiSelector> {
  declare audioNode: undefined;
  midiOutput!: MidiOutput;
  _forwardMidiEvent?: (midiEvent: MidiEvent) => void;

  constructor(
    engineId: string,
    params: ICreateModule<ModuleType.MidiSelector>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    super(engineId, {
      ...params,
      props,
    });

    this.addEventListener(this.props.selectedId);

    this.registerOutputs();
  }

  protected onSetSelectedId(value: string | null) {
    if (!this.superInitialized) return;

    this.removeEventListener();
    this.addEventListener(value);
  }

  private get forwardMidiEvent() {
    if (this._forwardMidiEvent) return this._forwardMidiEvent;

    this._forwardMidiEvent = (midiEvent: MidiEvent) => {
      this.midiOutput.onMidiEvent(midiEvent);
    };

    return this._forwardMidiEvent;
  }

  private addEventListener(midiId: string | undefined | null) {
    if (!midiId) return;

    const midiDevice = this.engine.findMidiDevice(midiId);
    midiDevice?.addEventListener(this.forwardMidiEvent);
  }

  private removeEventListener() {
    if (!this.props["selectedId"]) return;

    const midiDevice = this.engine.findMidiDevice(this.props["selectedId"]);
    midiDevice?.removeEventListener(this.forwardMidiEvent);
  }

  private registerOutputs() {
    this.midiOutput = this.registerMidiOutput({ name: "midi out" });
  }
}
