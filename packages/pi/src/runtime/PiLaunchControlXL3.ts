import {
  Engine,
  TransportState,
  type MatchedControllerPorts,
  type MidiEvent,
} from "@blibliki/engine";
import { getPiSessionByEngineId } from "./PiSession.js";

const PLAY = 116;
const RECORD = 118;
const PAGE_PREV = 106;
const PAGE_NEXT = 107;
const TRACK_PREV = 103;
const TRACK_NEXT = 102;
const SHIFT = 63;

const PLAY_STOPPED_COLOR = 16;
const PLAY_PLAYING_COLOR = 101;
const RECORD_IDLE_COLOR = 4;
const RECORD_ACTIVE_COLOR = 120;

export class PiLaunchControlXL3 {
  private readonly engineId: string;
  private readonly input: MatchedControllerPorts["input"];
  private readonly output: MatchedControllerPorts["output"];
  private disposed = false;

  constructor(engineId: string, ports: MatchedControllerPorts) {
    this.engineId = engineId;
    this.input = ports.input;
    this.output = ports.output;

    this.output.directSend([0xb6, 0x70, 0x00]);
    this.output.directSend([0x9f, 12, 127]);
    this.refreshTransport();

    this.input.addEventListener(this.onMidiEvent);
    Engine.getById(engineId).transport.addPropertyChangeCallback(
      "state",
      () => {
        this.refreshTransport();
      },
    );

    queueMicrotask(() => {
      getPiSessionByEngineId(engineId)?.attachControllerOutput(this.output);
    });
  }

  dispose() {
    if (this.disposed) return;

    this.input.removeEventListener(this.onMidiEvent);
    this.output.directSend([0x9f, 12, 0]);
    this.disposed = true;
  }

  private onMidiEvent = (event: MidiEvent) => {
    const session = getPiSessionByEngineId(this.engineId);
    if (!session || event.cc === undefined || event.ccValue === undefined) return;

    switch (event.cc) {
      case PLAY:
        if (event.ccValue === 127) {
          session.toggleTransport();
        }
        break;
      case RECORD:
        break;
      case PAGE_PREV:
      case PAGE_NEXT:
      case TRACK_PREV:
      case TRACK_NEXT:
      case SHIFT:
        session.handleControllerEvent(event.cc, event.ccValue);
        break;
      default:
        session.handleControllerEvent(event.cc, event.ccValue);
    }
  };

  private refreshTransport() {
    const engine = Engine.getById(this.engineId);
    const isPlaying = engine.state === TransportState.playing;
    this.output.directSend([176, PLAY, isPlaying ? PLAY_PLAYING_COLOR : PLAY_STOPPED_COLOR]);
    this.output.directSend([176, RECORD, isPlaying ? RECORD_ACTIVE_COLOR : RECORD_IDLE_COLOR]);
  }
}
