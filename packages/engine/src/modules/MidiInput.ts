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

export type IMidiInput = IModule<ModuleType.MidiInput>;
export type IMidiInputProps = {
  selectedId: string | undefined | null;
  selectedName: string | undefined | null;
  allIns: boolean;
  excludedIds: string[];
  excludedNames: string[];
};

export const midiInputPropSchema: ModulePropSchema<IMidiInputProps> = {
  selectedId: {
    kind: "string",
    label: "Midi device ID",
  },
  selectedName: {
    kind: "string",
    label: "Midi device name",
  },
  allIns: {
    kind: "boolean",
    label: "All ins",
  },
  excludedIds: {
    kind: "array",
    label: "Excluded MIDI device IDs",
  },
  excludedNames: {
    kind: "array",
    label: "Excluded MIDI device names",
  },
};

const DEFAULT_PROPS: IMidiInputProps = {
  selectedId: undefined,
  selectedName: undefined,
  allIns: false,
  excludedIds: [],
  excludedNames: [],
};

export default class MidiInput
  extends Module<ModuleType.MidiInput>
  implements Pick<SetterHooks<IMidiInputProps>, "onSetSelectedId">
{
  declare audioNode: undefined;
  midiOutput!: MidiOutput;
  _forwardMidiEvent?: (midiEvent: MidiEvent) => void;
  private unsubscribeDeviceListener?: () => void;
  private attachedDevices = new Map<
    string,
    MidiInputDevice | ComputerKeyboardInput
  >();

  constructor(engineId: string, params: ICreateModule<ModuleType.MidiInput>) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    super(engineId, {
      ...params,
      props,
    });

    this.registerOutputs();
    this.attachConfiguredInputs();
    this.subscribeToDeviceChanges();
  }

  onSetSelectedId: SetterHooks<IMidiInputProps>["onSetSelectedId"] = (
    value,
  ) => {
    if (this.props.allIns) return value;
    this.syncAttachedDevices();

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
    this.attachedDevices.set(midiDevice.id, midiDevice);
  }

  private removeEventListener() {
    this.attachedDevices.forEach((midiDevice) => {
      midiDevice.removeEventListener(this.forwardMidiEvent);
    });
    this.attachedDevices.clear();
  }

  private attachConfiguredInputs() {
    if (this.props.allIns) {
      this.syncAttachedDevices();
      return;
    }

    const midiDevice = this.findSelectedInputDevice();
    if (midiDevice) {
      this.persistResolvedDevice(midiDevice);
    }
  }

  private findSelectedInputDevice() {
    let midiDevice =
      this.props.selectedId &&
      this.engine.findMidiInputDevice(this.props.selectedId);

    if (!midiDevice && this.props.selectedName) {
      midiDevice = this.engine.findMidiInputDeviceByName(
        this.props.selectedName,
      );

      if (!midiDevice) {
        const fuzzyMatch = this.engine.findMidiInputDeviceByFuzzyName(
          this.props.selectedName,
          0.6,
        );

        if (fuzzyMatch) {
          midiDevice = fuzzyMatch.device;
          console.log(
            `MIDI device fuzzy matched: "${this.props.selectedName}" -> "${midiDevice.name}" (confidence: ${Math.round(fuzzyMatch.score * 100)}%)`,
          );
        }
      }
    }

    return midiDevice;
  }

  private findAllInputDevices() {
    return Array.from(this.engine.midiDeviceManager.inputDevices.values());
  }

  private isExcludedDevice(
    midiDevice: MidiInputDevice | ComputerKeyboardInput,
  ) {
    return (
      this.props.excludedIds.includes(midiDevice.id) ||
      this.props.excludedNames.includes(midiDevice.name)
    );
  }

  private registerOutputs() {
    this.midiOutput = this.registerMidiOutput({ name: "midi out" });
  }

  private persistResolvedDevice(
    midiDevice: MidiInputDevice | ComputerKeyboardInput,
  ) {
    const didChange =
      this._props.selectedId !== midiDevice.id ||
      this._props.selectedName !== midiDevice.name;

    this._props = {
      ...this._props,
      selectedId: midiDevice.id,
      selectedName: midiDevice.name,
    };

    if (didChange && this._propsInitialized) {
      this.triggerPropsUpdate();
    }
  }

  private subscribeToDeviceChanges() {
    this.unsubscribeDeviceListener = this.engine.midiDeviceManager.addListener(
      () => {
        this.syncAttachedDevices();
      },
    );
  }

  private syncAttachedDevices() {
    const desiredDevices = new Map<
      string,
      MidiInputDevice | ComputerKeyboardInput
    >();

    if (this.props.allIns) {
      this.findAllInputDevices().forEach((midiDevice) => {
        if (this.isExcludedDevice(midiDevice)) return;
        desiredDevices.set(midiDevice.id, midiDevice);
      });
    } else if (this.props.selectedId || this.props.selectedName) {
      const midiDevice = this.findSelectedInputDevice();
      if (midiDevice) {
        this.persistResolvedDevice(midiDevice);
        desiredDevices.set(midiDevice.id, midiDevice);
      }
    }

    this.attachedDevices.forEach((midiDevice, id) => {
      if (desiredDevices.has(id)) return;

      midiDevice.removeEventListener(this.forwardMidiEvent);
      this.attachedDevices.delete(id);
    });

    desiredDevices.forEach((midiDevice, id) => {
      if (this.attachedDevices.has(id)) return;
      this.addEventListener(midiDevice);
    });
  }

  override dispose(): void {
    this.unsubscribeDeviceListener?.();
    this.removeEventListener();
    super.dispose();
  }
}
