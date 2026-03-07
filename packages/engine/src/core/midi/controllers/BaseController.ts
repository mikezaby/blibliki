import { ContextTime, TransportState } from "@blibliki/transport";
import { Engine } from "@/Engine";

export abstract class BaseController {
  protected engineId: string;
  protected isInDawMode = false;

  constructor(engineId: string) {
    this.engineId = engineId;
    this.transport.addPropertyChangeCallback(
      "state",
      this.onStateChange.bind(this),
    );
  }

  abstract enterDawMode(): Promise<void>;
  abstract exitDawMode(): Promise<void>;

  start() {
    void this.engine.start();
  }

  stop() {
    this.engine.stop();
  }

  abstract onStateChange(state: TransportState, actionAt: ContextTime): void;

  protected get transport() {
    return Engine.getById(this.engineId).transport;
  }

  protected get engine() {
    return Engine.getById(this.engineId);
  }
}
