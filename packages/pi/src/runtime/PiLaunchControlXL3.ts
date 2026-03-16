import {
  LaunchControlXL3,
  type MatchedControllerPorts,
  type MidiEvent,
} from "@blibliki/engine";
import { getPiSessionByEngineId } from "./PiSession.js";

const PLAY = 116;
const RECORD = 118;

export class PiLaunchControlXL3 extends LaunchControlXL3 {
  private readonly piInput: MatchedControllerPorts["input"];
  private readonly piOutput: MatchedControllerPorts["output"];
  private piDisposed = false;

  constructor(engineId: string, ports: MatchedControllerPorts) {
    super(engineId, ports);
    this.piInput = ports.input;
    this.piOutput = ports.output;

    queueMicrotask(() => {
      if (this.piDisposed) return;
      this.piInput.addEventListener(this.onPiMidiEvent);
      getPiSessionByEngineId(engineId)?.attachControllerOutput(this.piOutput);
    });
  }

  override dispose() {
    if (this.piDisposed) return;

    this.piInput.removeEventListener(this.onPiMidiEvent);
    super.dispose();
    this.piDisposed = true;
  }

  private onPiMidiEvent = (event: MidiEvent) => {
    const session = getPiSessionByEngineId(this.engineId);
    if (!session || event.cc === undefined || event.ccValue === undefined) {
      return;
    }
    if (event.cc === PLAY || event.cc === RECORD) return;

    session.handleControllerEvent(event.cc, event.ccValue);
  };
}
