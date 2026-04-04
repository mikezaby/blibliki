import { ContextTime, TransportState } from "@blibliki/transport";
import { Engine } from "@/Engine";
import MidiEvent from "../MidiEvent";
import type { MatchedControllerPorts } from "./ControllerMatcher";

export abstract class BaseController {
  protected engineId: string;
  protected input: MatchedControllerPorts["input"];
  protected output: MatchedControllerPorts["output"];
  protected isInDawMode = false;
  protected disposed = false;
  protected inputEventDataMutator?:
    | ((data: number[] | Uint8Array) => number[] | Uint8Array)
    | undefined;

  constructor(engineId: string, ports: MatchedControllerPorts) {
    this.engineId = engineId;
    this.input = ports.input;
    this.output = ports.output;

    this.transport.addPropertyChangeCallback(
      "state",
      this.onStateChange.bind(this),
    );
    this.enterDawMode();

    queueMicrotask(() => {
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
    this.input.removeEventListener(this.onMidiEvent);
    this.input.eventDataMutator = undefined;
    this.output.eventDataMutator = undefined;
    this.exitDawMode();
    this.disposed = true;
  }

  abstract onStateChange(state: TransportState, actionAt: ContextTime): void;

  protected get transport() {
    return Engine.getById(this.engineId).transport;
  }

  protected get engine() {
    return Engine.getById(this.engineId);
  }
}
