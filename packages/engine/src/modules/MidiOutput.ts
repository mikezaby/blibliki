import {
  IModule,
  Module,
  MidiInput,
  SetterHooks,
  MidiOutputDevice,
} from "@/core";
import MidiEvent from "@/core/midi/MidiEvent";
import { ModulePropSchema } from "@/core/schema";
import { ICreateModule, ModuleType } from ".";

export type IMidiOutput = IModule<ModuleType.MidiOutput>;
export type IMidiOutputProps = {
  selectedId: string | undefined | null;
  selectedName: string | undefined | null;
};

export const midiOutputPropSchema: ModulePropSchema<IMidiOutputProps> = {
  selectedId: {
    kind: "string",
    label: "Midi device ID",
  },
  selectedName: {
    kind: "string",
    label: "Midi device name",
  },
};

const DEFAULT_PROPS: IMidiOutputProps = {
  selectedId: undefined,
  selectedName: undefined,
};

export default class MidiOutput
  extends Module<ModuleType.MidiOutput>
  implements Pick<SetterHooks<IMidiOutputProps>, "onSetSelectedId">
{
  declare audioNode: undefined;
  midiInput!: MidiInput;
  private currentDevice?: MidiOutputDevice;

  constructor(engineId: string, params: ICreateModule<ModuleType.MidiOutput>) {
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
      this.engine.findMidiOutputDevice(this.props.selectedId);

    if (!midiDevice && this.props.selectedName) {
      midiDevice = this.engine.findMidiOutputDeviceByName(
        this.props.selectedName,
      );

      // If exact name match fails, try fuzzy matching
      if (!midiDevice) {
        const fuzzyMatch = this.engine.findMidiOutputDeviceByFuzzyName(
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
      this.currentDevice = midiDevice;
    }

    this.registerInputs();
  }

  onSetSelectedId: SetterHooks<IMidiOutputProps>["onSetSelectedId"] = (
    value,
  ) => {
    if (!value) {
      this.currentDevice = undefined;
      return value;
    }

    const midiDevice = this.engine.findMidiOutputDevice(value);
    if (!midiDevice) return value;

    if (this.props.selectedName !== midiDevice.name) {
      this.props = { selectedName: midiDevice.name };
      this.triggerPropsUpdate();
    }

    this.currentDevice = midiDevice;

    return value;
  };

  onMidiEvent = (midiEvent: MidiEvent) => {
    if (!this.currentDevice) return;

    // Send raw MIDI data to hardware
    const rawData = midiEvent.rawMessage.data;
    this.currentDevice.send(rawData);
  };

  private registerInputs() {
    this.midiInput = this.registerMidiInput({
      name: "midi in",
      onMidiEvent: this.onMidiEvent,
    });
  }
}
