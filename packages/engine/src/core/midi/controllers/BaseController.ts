import { ContextTime, TransportState } from "@blibliki/transport";
import { Engine } from "@/Engine";
import MidiEvent from "../MidiEvent";
import type { MatchedControllerPorts } from "./ControllerMatcher";

export abstract class BaseController {
  private static hardwareSessionRefCounts = new Map<string, number>();

  protected engineId: string;
  protected input: MatchedControllerPorts["input"];
  protected output: MatchedControllerPorts["output"];
  protected isInDawMode = false;
  protected disposed = false;
  private readonly hardwareSessionKey: string;
  protected inputEventDataMutator?:
    | ((data: number[] | Uint8Array) => number[] | Uint8Array)
    | undefined;

  constructor(engineId: string, ports: MatchedControllerPorts) {
    this.engineId = engineId;
    this.input = ports.input;
    this.output = ports.output;
    this.hardwareSessionKey = `${ports.input.id}:${ports.output.id}`;

    this.transport.addPropertyChangeCallback(
      "state",
      this.onStateChange.bind(this),
    );
    this.retainHardwareSession();
    this.enterDawMode();

    queueMicrotask(() => {
      if (this.disposed) {
        return;
      }

      this.input.addEventListener(this.onMidiEvent);
      this.input.eventDataMutator = this.inputEventDataMutator;
      this.output.eventDataMutator = this.eventDataMutator;
    });
  }

  abstract enterDawMode(): void;
  abstract exitDawMode(): void;

  protected abstract onMidiEvent: (event: MidiEvent) => void;
  protected abstract eventDataMutator: (
    data: number[] | Uint8Array,
  ) => number[] | Uint8Array;

  start() {
    void this.engine.start();
  }

  stop() {
    this.engine.stop();
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
    } else {
      this.start();
    }
  }

  protected get isPlaying() {
    return this.transport.state === TransportState.playing;
  }

  dispose() {
    if (this.disposed) {
      return;
    }

    this.input.removeEventListener(this.onMidiEvent);
    this.input.eventDataMutator = undefined;
    this.output.eventDataMutator = undefined;
    if (this.releaseHardwareSession() === 0) {
      this.exitDawMode();
    }
    this.disposed = true;
  }

  abstract onStateChange(state: TransportState, actionAt: ContextTime): void;

  protected get transport() {
    return Engine.getById(this.engineId).transport;
  }

  protected get engine() {
    return Engine.getById(this.engineId);
  }

  private retainHardwareSession() {
    const current =
      BaseController.hardwareSessionRefCounts.get(this.hardwareSessionKey) ?? 0;
    BaseController.hardwareSessionRefCounts.set(
      this.hardwareSessionKey,
      current + 1,
    );
  }

  private releaseHardwareSession() {
    const current =
      BaseController.hardwareSessionRefCounts.get(this.hardwareSessionKey) ?? 0;

    if (current <= 1) {
      BaseController.hardwareSessionRefCounts.delete(this.hardwareSessionKey);
      return 0;
    }

    const next = current - 1;
    BaseController.hardwareSessionRefCounts.set(this.hardwareSessionKey, next);

    return next;
  }
}
