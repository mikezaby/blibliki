import { IModule, MidiOutput, Module, ModulePropSchema } from "@/core";
import MidiEvent from "@/core/midi/MidiEvent";
import { ICreateModule, ModuleType } from ".";

export type IMidiChannelFilter = IModule<ModuleType.MidiChannelFilter>;
export type IMidiChannelFilterProps = {
  channel: number;
};

export const midiChannelFilterPropSchema: ModulePropSchema<IMidiChannelFilterProps> =
  {
    channel: {
      kind: "number",
      min: 1,
      max: 16,
      step: 1,
      label: "Channel",
    },
  };

const DEFAULT_PROPS: IMidiChannelFilterProps = {
  channel: 1,
};

export default class MidiChannelFilter extends Module<ModuleType.MidiChannelFilter> {
  declare audioNode: undefined;
  midiOutput!: MidiOutput;

  constructor(
    engineId: string,
    params: ICreateModule<ModuleType.MidiChannelFilter>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    super(engineId, {
      ...params,
      props,
    });

    this.registerInputs();
    this.registerOutputs();
  }

  onMidiEvent = (event: MidiEvent) => {
    if (event.channel === undefined) return;
    if (event.channel !== this.props.channel - 1) return;

    this.midiOutput.onMidiEvent(event);
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
