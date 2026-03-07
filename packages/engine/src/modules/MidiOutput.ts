import {
  IModule,
  Module,
  MidiInput,
  SetterHooks,
  MidiPortState,
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

    this.currentDevice = this.resolveSelectedDevice();

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
    if (!this.isConnected(midiDevice)) {
      this.currentDevice = undefined;
      return value;
    }

    if (this.props.selectedName !== midiDevice.name) {
      this.props = { selectedName: midiDevice.name };
      this.triggerPropsUpdate();
    }

    this.currentDevice = midiDevice;

    return value;
  };

  onMidiEvent = (midiEvent: MidiEvent) => {
    const midiDevice = this.resolveCurrentDevice();
    if (!midiDevice) return;

    // Send raw MIDI data to hardware
    const rawData = midiEvent.rawMessage.data;
    midiDevice.send(rawData);
  };

  private resolveCurrentDevice() {
    if (
      this.currentDevice &&
      this.isConnected(this.currentDevice) &&
      this.engine.findMidiOutputDevice(this.currentDevice.id) ===
        this.currentDevice
    ) {
      return this.currentDevice;
    }

    this.currentDevice = this.resolveSelectedDevice();
    return this.currentDevice;
  }

  private resolveSelectedDevice() {
    const selectedById = this.props.selectedId
      ? this.engine.findMidiOutputDevice(this.props.selectedId)
      : undefined;

    if (this.isConnected(selectedById)) {
      return selectedById;
    }

    if (!this.props.selectedName) return undefined;

    const selectedByName = this.engine.findMidiOutputDeviceByName(
      this.props.selectedName,
    );
    if (this.isConnected(selectedByName)) {
      return selectedByName;
    }

    const fuzzyMatch = this.engine.findMidiOutputDeviceByFuzzyName(
      this.props.selectedName,
      0.6,
    );

    if (this.isConnected(fuzzyMatch?.device)) {
      return fuzzyMatch.device;
    }

    return undefined;
  }

  private isConnected(
    midiDevice?: MidiOutputDevice | null,
  ): midiDevice is MidiOutputDevice {
    return midiDevice?.state === MidiPortState.connected;
  }

  private registerInputs() {
    this.midiInput = this.registerMidiInput({
      name: "midi in",
      onMidiEvent: this.onMidiEvent,
    });
  }
}
