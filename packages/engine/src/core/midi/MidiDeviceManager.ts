import { Context } from "@blibliki/utils";
import ComputerKeyboardDevice from "./ComputerKeyboardDevice";
import MidiInputDevice from "./MidiInputDevice";
import MidiOutputDevice from "./MidiOutputDevice";
import {
  createMidiAdapter,
  type IMidiAccess,
  type IMidiPort,
} from "./adapters";
import { LaunchControlXL3 } from "./controllers/LaunchControlXL3";
import { findBestMatch } from "./deviceMatcher";

const MIDI_DEBUG_FLAG = "__BLIBLIKI_MIDI_DEBUG__";
const LAUNCH_CONTROL_DAW_INPUT_NAMES = [
  "LCXL3 DAW In",
  "LCXL3 DAW",
  "Launch Control XL 3 DAW In",
  "Launch Control XL3 DAW In",
  "Launch Control XL 3 DAW",
  "Launch Control XL3 DAW",
  "Launch Control XL 3",
] as const;
const LAUNCH_CONTROL_DAW_OUTPUT_NAMES = [
  "LCXL3 DAW Out",
  "LCXL3 DAW",
  "Launch Control XL 3 DAW Out",
  "Launch Control XL3 DAW Out",
  "Launch Control XL 3 DAW",
  "Launch Control XL3 DAW",
  "Launch Control XL 3",
] as const;

type ListenerCallback = (device: MidiInputDevice | MidiOutputDevice) => void;
type ControllerTransportControls = {
  onStart: () => Promise<void> | void;
  onStop: () => void;
  isPlayingState: () => boolean;
  onPageUp?: () => Promise<void> | void;
  onPageDown?: () => Promise<void> | void;
  onTrackPrev?: () => Promise<void> | void;
  onTrackNext?: () => Promise<void> | void;
};

export default class MidiDeviceManager {
  inputDevices = new Map<string, MidiInputDevice | ComputerKeyboardDevice>();
  outputDevices = new Map<string, MidiOutputDevice>();
  private initialized = false;
  private listeners: ListenerCallback[] = [];
  private context: Readonly<Context>;
  private controllerTransportControls?: ControllerTransportControls;
  private midiAccess: IMidiAccess | null = null;
  private launchControl?: LaunchControlXL3;
  private midiStateChangeListener?: (port: IMidiPort) => void;
  private adapter = createMidiAdapter();

  constructor(context: Context, controls?: ControllerTransportControls) {
    this.context = context;
    this.controllerTransportControls = controls;
    this.addComputerKeyboard();
  }

  async initialize() {
    await this.initializeDevices();
    this.reconcileLaunchControl();
    this.listenChanges();
    this.initialized = true;
  }

  find(
    id: string,
  ): MidiInputDevice | ComputerKeyboardDevice | MidiOutputDevice | undefined {
    return this.findInput(id) ?? this.findOutput(id);
  }

  findByName(
    name: string,
  ): MidiInputDevice | ComputerKeyboardDevice | MidiOutputDevice | undefined {
    return this.findInputByName(name) ?? this.findOutputByName(name);
  }

  findByFuzzyName(
    name: string,
    threshold = 0.6,
  ): MidiInputDevice | ComputerKeyboardDevice | MidiOutputDevice | undefined {
    const input = this.findInputByFuzzyName(name, threshold);
    const output = this.findOutputByFuzzyName(name, threshold);

    if (!input) return output?.device;
    if (!output) return input.device;

    return input.score > output.score ? input.device : output.device;
  }

  findInput(id: string): MidiInputDevice | ComputerKeyboardDevice | undefined {
    return this.inputDevices.get(id);
  }

  findInputByName(
    name: string,
  ): MidiInputDevice | ComputerKeyboardDevice | undefined {
    return Array.from(this.inputDevices.values()).find((d) => d.name === name);
  }

  findOutput(id: string): MidiOutputDevice | undefined {
    return this.outputDevices.get(id);
  }

  findOutputByName(name: string): MidiOutputDevice | undefined {
    return Array.from(this.outputDevices.values()).find((d) => d.name === name);
  }

  /**
   * Finds a device using fuzzy name matching
   * Useful for matching devices across browser/Node.js environments where names differ
   *
   * @param targetName - The device name to match
   * @param threshold - Minimum similarity score (0-1, default: 0.6)
   * @returns The best matching device and confidence score, or null
   */
  findInputByFuzzyName(
    targetName: string,
    threshold = 0.6,
  ): {
    device: MidiInputDevice | ComputerKeyboardDevice;
    score: number;
  } | null {
    const deviceEntries = Array.from(this.inputDevices.values());
    const candidateNames = deviceEntries.map((d) => d.name);

    const match = findBestMatch(targetName, candidateNames, threshold);

    if (!match) return null;

    const device = deviceEntries.find((d) => d.name === match.name);

    return device ? { device, score: match.score } : null;
  }

  findOutputByFuzzyName(
    targetName: string,
    threshold = 0.6,
  ): { device: MidiOutputDevice; score: number } | null {
    const deviceEntries = Array.from(this.outputDevices.values());
    const candidateNames = deviceEntries.map((d) => d.name);

    const match = findBestMatch(targetName, candidateNames, threshold);

    if (!match) return null;

    const device = deviceEntries.find((d) => d.name === match.name);

    return device ? { device, score: match.score } : null;
  }

  addListener(callback: ListenerCallback) {
    this.listeners.push(callback);
  }

  dispose() {
    this.disposeLaunchControl();

    if (this.midiAccess && this.midiStateChangeListener) {
      this.midiAccess.removeEventListener(
        "statechange",
        this.midiStateChangeListener,
      );
      this.midiStateChangeListener = undefined;
    }

    this.inputDevices.forEach((device) => {
      if (device instanceof ComputerKeyboardDevice) return;
      device.disconnect();
    });
    this.outputDevices.forEach((device) => {
      device.disconnect();
    });

    this.inputDevices.clear();
    this.outputDevices.clear();
    this.listeners = [];
    this.midiAccess = null;
    this.initialized = false;
  }

  private async initializeDevices() {
    if (this.initialized) return;

    try {
      if (!this.adapter.isSupported()) {
        console.warn("MIDI is not supported on this platform");
        return;
      }

      this.midiAccess = await this.adapter.requestMIDIAccess();

      if (!this.midiAccess) {
        console.error("Failed to get MIDI access");
        return;
      }

      for (const input of this.midiAccess.inputs()) {
        if (!this.inputDevices.has(input.id)) {
          this.inputDevices.set(
            input.id,
            new MidiInputDevice(input, this.context),
          );
        }
      }

      for (const output of this.midiAccess.outputs()) {
        if (!this.outputDevices.has(output.id)) {
          this.outputDevices.set(output.id, new MidiOutputDevice(output));
        }
      }
    } catch (err) {
      console.error("Error enabling MIDI:", err);
    }
  }

  private addComputerKeyboard() {
    if (typeof document === "undefined") return;

    const computerKeyboardDevice = new ComputerKeyboardDevice(this.context);
    this.inputDevices.set(computerKeyboardDevice.id, computerKeyboardDevice);
  }

  private listenChanges() {
    if (!this.midiAccess || this.midiStateChangeListener) return;

    this.midiStateChangeListener = (port) => {
      this.debug("MIDI statechange", {
        id: port.id,
        name: port.name,
        type: port.type,
        state: port.state,
      });

      if (port.state === "connected") {
        // Device connected
        if (port.type === "input") {
          if (this.inputDevices.has(port.id)) return;

          // Find the actual input port from midiAccess
          for (const input of this.midiAccess!.inputs()) {
            if (input.id === port.id) {
              const device = new MidiInputDevice(input, this.context);
              this.inputDevices.set(device.id, device);

              this.listeners.forEach((listener) => {
                listener(device);
              });
              break;
            }
          }
        } else {
          // Output device connected
          if (this.outputDevices.has(port.id)) return;

          // Find the actual output port from midiAccess
          for (const output of this.midiAccess!.outputs()) {
            if (output.id === port.id) {
              const device = new MidiOutputDevice(output);
              this.outputDevices.set(device.id, device);
              break;
            }
          }
        }
      } else {
        // Device disconnected
        if (port.type === "input") {
          const device = this.inputDevices.get(port.id);
          if (!device) return;
          if (device instanceof ComputerKeyboardDevice) return;

          device.disconnect();
          this.inputDevices.delete(device.id);

          this.listeners.forEach((listener) => {
            listener(device);
          });
        } else {
          // Output device disconnected
          const device = this.outputDevices.get(port.id);
          if (!device) return;

          device.disconnect();
          this.outputDevices.delete(device.id);
        }
      }

      this.reconcileLaunchControl();
    };

    this.midiAccess.addEventListener(
      "statechange",
      this.midiStateChangeListener,
    );
  }

  private reconcileLaunchControl() {
    const inputMatch = this.findLaunchControlInput();
    const outputMatch = this.findLaunchControlOutput();
    const input = inputMatch?.device;
    const output = outputMatch?.device;

    this.debug("LaunchControl match summary", {
      inputCandidate: inputMatch?.candidate,
      inputDevice: input?.name,
      inputScore: inputMatch?.score,
      outputCandidate: outputMatch?.candidate,
      outputDevice: output?.name,
      outputScore: outputMatch?.score,
    });

    if (!input || !output) {
      if (this.launchControl) {
        this.debug("Disposing LaunchControl due to missing DAW ports");
      }
      this.disposeLaunchControl();
      return;
    }

    const currentLaunchControl = this.launchControl;
    if (
      currentLaunchControl?.input.id === input.id &&
      currentLaunchControl.output.id === output.id
    ) {
      return;
    }

    this.disposeLaunchControl();
    this.launchControl = new LaunchControlXL3({
      input,
      output,
      ...this.controllerTransportControls,
    });
    this.debug("LaunchControl connected", {
      input: input.name,
      output: output.name,
    });
  }

  private disposeLaunchControl() {
    if (this.launchControl) {
      this.debug("LaunchControl disposed");
    }
    this.launchControl?.dispose();
    this.launchControl = undefined;
  }

  private findLaunchControlInput():
    | {
        candidate: string;
        device: MidiInputDevice;
        score: number;
      }
    | undefined {
    let bestMatch:
      | {
          candidate: string;
          device: MidiInputDevice;
          score: number;
        }
      | undefined;

    LAUNCH_CONTROL_DAW_INPUT_NAMES.forEach((candidate) => {
      const match = this.findInputByFuzzyName(candidate, 0.45);
      if (!match || !(match.device instanceof MidiInputDevice)) return;
      if (!bestMatch || match.score > bestMatch.score) {
        bestMatch = {
          candidate,
          device: match.device,
          score: match.score,
        };
      }
    });

    return bestMatch;
  }

  private findLaunchControlOutput():
    | {
        candidate: string;
        device: MidiOutputDevice;
        score: number;
      }
    | undefined {
    let bestMatch:
      | {
          candidate: string;
          device: MidiOutputDevice;
          score: number;
        }
      | undefined;

    LAUNCH_CONTROL_DAW_OUTPUT_NAMES.forEach((candidate) => {
      const match = this.findOutputByFuzzyName(candidate, 0.45);
      if (!match) return;
      if (!bestMatch || match.score > bestMatch.score) {
        bestMatch = {
          candidate,
          device: match.device,
          score: match.score,
        };
      }
    });

    return bestMatch;
  }

  private debug(message: string, metadata?: Record<string, unknown>) {
    if (
      !(globalThis as unknown as Record<string, unknown> | undefined)?.[
        MIDI_DEBUG_FLAG
      ]
    ) {
      return;
    }

    if (metadata) {
      console.debug(`[MidiDeviceManager] ${message}`, metadata);
      return;
    }

    console.debug(`[MidiDeviceManager] ${message}`);
  }
}
