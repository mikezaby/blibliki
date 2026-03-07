import { ContextTime, TransportState } from "@blibliki/transport";
import { Engine } from "@/Engine";
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
  }

  abstract enterDawMode(): void;
  abstract exitDawMode(): void;

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
