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

  protected isPlaying() {
    return this.transport.state === TransportState.playing;
  }

  dispose() {
    this.input.removeEventListener(this.onMidiEvent);
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
