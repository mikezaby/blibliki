import { IModule, Module, MidiOutput, SetterHooks, MidiDevice } from "@/core";
import ComputerKeyboardInput from "@/core/midi/ComputerKeyboardDevice";
import MidiEvent from "@/core/midi/MidiEvent";
import { ModulePropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

export type IMidiSelector = IModule<ModuleType.MidiSelector>;
export type IMidiSelectorProps = {
  selectedId: string | undefined | null;
  selectedName: string | undefined | null;
};

export const midiSelectorPropSchema: ModulePropSchema<IMidiSelectorProps> = {
  selectedId: {
    kind: "string",
    label: "Midi device ID",
  },
  selectedName: {
    kind: "string",
    label: "Midi device name",
  },
};

const DEFAULT_PROPS: IMidiSelectorProps = {
  selectedId: undefined,
  selectedName: undefined,
};

export default class MidiSelector
  extends Module<ModuleType.MidiSelector>
  implements Pick<SetterHooks<IMidiSelectorProps>, "onSetSelectedId">
{
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

    const midiDevice =
      (this.props.selectedId &&
        this.engine.findMidiDevice(this.props.selectedId)) ??
      (this.props.selectedName &&
        this.engine.findMidiDeviceByName(this.props.selectedName));

    if (midiDevice) {
      this.addEventListener(midiDevice);
    }

    this.registerOutputs();
  }

  onSetSelectedId: SetterHooks<IMidiSelectorProps>["onSetSelectedId"] = (
    value,
  ) => {
    this.removeEventListener();
    if (!value) return value;

    const midiDevice = this.engine.findMidiDevice(value);
    if (!midiDevice) return undefined;

    this.props = { selectedName: midiDevice.name };
    this.addEventListener(midiDevice);

    return value;
  };

  private get forwardMidiEvent() {
    if (this._forwardMidiEvent) return this._forwardMidiEvent;

    this._forwardMidiEvent = (midiEvent: MidiEvent) => {
      this.midiOutput.onMidiEvent(midiEvent);
    };

    return this._forwardMidiEvent;
  }

  private addEventListener(midiDevice: MidiDevice | ComputerKeyboardInput) {
    midiDevice.addEventListener(this.forwardMidiEvent);
  }

  private removeEventListener() {
    if (!this.props.selectedId) return;

    const midiDevice = this.engine.findMidiDevice(this.props.selectedId);
    midiDevice?.removeEventListener(this.forwardMidiEvent);
  }

  private registerOutputs() {
    this.midiOutput = this.registerMidiOutput({ name: "midi out" });
  }
}
