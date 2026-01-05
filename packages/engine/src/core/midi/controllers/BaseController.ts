import type { IMidiOutputPort } from "../adapters";

export abstract class BaseController {
  protected outputPort: IMidiOutputPort;
  protected isInDawMode = false;

  constructor(outputPort: IMidiOutputPort) {
    this.outputPort = outputPort;
  }

  abstract enterDawMode(): Promise<void>;

  abstract exitDawMode(): Promise<void>;
}
