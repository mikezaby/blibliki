import {
  IModule,
  Module,
  MidiOutput,
  SetterHooks,
  MidiInputDevice,
} from "@/core";
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

    // Try to find device in order of preference:
    // 1. By exact ID match
    // 2. By exact name match
    // 3. By fuzzy name match (for cross-platform compatibility)
    let midiDevice =
      this.props.selectedId &&
      this.engine.findMidiInputDevice(this.props.selectedId);

    if (!midiDevice && this.props.selectedName) {
      midiDevice = this.engine.findMidiInputDeviceByName(
        this.props.selectedName,
      );

      // If exact name match fails, try fuzzy matching
      if (!midiDevice) {
        const fuzzyMatch = this.engine.findMidiInputDeviceByFuzzyName(
          this.props.selectedName,
          0.6, // 60% similarity threshold
        );

        if (fuzzyMatch) {
          midiDevice = fuzzyMatch.device;
          console.log(
            `MIDI device fuzzy matched: "${this.props.selectedName}" -> "${midiDevice.name}" (confidence: ${Math.round(fuzzyMatch.score * 100)}%)`,
          );
        }
      }
    }

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

    const midiDevice = this.engine.findMidiInputDevice(value);
    if (!midiDevice) return value;

    if (this.props.selectedName !== midiDevice.name) {
      this.props = { selectedName: midiDevice.name };
      this.triggerPropsUpdate();
    }
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

  private addEventListener(
    midiDevice: MidiInputDevice | ComputerKeyboardInput,
  ) {
    midiDevice.addEventListener(this.forwardMidiEvent);
  }

  private removeEventListener() {
    if (!this.props.selectedId) return;

    const midiDevice = this.engine.findMidiInputDevice(this.props.selectedId);
    midiDevice?.removeEventListener(this.forwardMidiEvent);
  }

  private registerOutputs() {
    this.midiOutput = this.registerMidiOutput({ name: "midi out" });
  }
}
