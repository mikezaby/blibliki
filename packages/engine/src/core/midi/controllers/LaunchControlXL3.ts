import { ContextTime, TransportState } from "@blibliki/transport";
import MidiEvent from "../MidiEvent";
import { BaseController } from "./BaseController";
import type { MatchedControllerPorts } from "./ControllerMatcher";

enum Color {
  Gray0 = 0,
  Red0 = 4,
  Red6 = 120,
  Red5 = 106,
  Orange5 = 96,
  Yellow5 = 74,
  Green0 = 16,
  Green10 = 76,
  Green15 = 101,
  Cyan5 = 37,
  Blue3 = 43,
  Purple3 = 51,
  Pink5 = 57,
}

enum Control {
  Encoder0_0 = 13,
  Encoder0_1 = 14,
  Encoder0_2 = 15,
  Encoder0_3 = 16,
  Encoder0_4 = 17,
  Encoder0_5 = 18,
  Encoder0_6 = 19,
  Encoder0_7 = 20,

  Encoder1_0 = 21,
  Encoder1_1 = 22,
  Encoder1_2 = 23,
  Encoder1_3 = 24,
  Encoder1_4 = 25,
  Encoder1_5 = 26,
  Encoder1_6 = 27,
  Encoder1_7 = 28,

  Encoder2_0 = 29,
  Encoder2_1 = 30,
  Encoder2_2 = 31,
  Encoder2_3 = 32,
  Encoder2_4 = 33,
  Encoder2_5 = 34,
  Encoder2_6 = 35,
  Encoder2_7 = 36,

  ChannelButton0_0 = 37,
  ChannelButton0_1 = 38,
  ChannelButton0_2 = 39,
  ChannelButton0_3 = 40,
  ChannelButton0_4 = 41,
  ChannelButton0_5 = 42,
  ChannelButton0_6 = 43,
  ChannelButton0_7 = 44,

  ChannelButton1_0 = 45,
  ChannelButton1_1 = 46,
  ChannelButton1_2 = 47,
  ChannelButton1_3 = 48,
  ChannelButton1_4 = 49,
  ChannelButton1_5 = 50,
  ChannelButton1_6 = 51,
  ChannelButton1_7 = 52,

  Play = 116,
  Record = 118,
}

const PLAY_CONTROL = 116;
const RECORD_CONTROL = 118;

export class LaunchControlXL3 extends BaseController {
  private inputListener?: (event: MidiEvent) => void;

  constructor(engineId: string, ports: MatchedControllerPorts) {
    super(engineId, ports);
    this.initialize();
  }

  onStateChange(_state: TransportState, _actionAt: ContextTime): void {
    this.updateTransportColors();
  }

  enterDawMode(): void {
    this.output.send([159, 12, 127]);
    this.isInDawMode = true;
  }

  exitDawMode(): void {
    this.output.send([159, 12, 0]);
    this.isInDawMode = false;
  }

  override dispose() {
    if (this.disposed) return;

    if (this.inputListener) {
      this.input.removeEventListener(this.inputListener);
      this.inputListener = undefined;
    }

    this.exitDawMode();
    super.dispose();
  }

  private initialize() {
    this.bindTransportControls();
    this.exitDawMode();
    this.enterDawMode();
    this.sendBigBlibliki();
  }

  private bindTransportControls() {
    this.inputListener = (event) => {
      this.onMidiEvent(event);
    };
    this.input.addEventListener(this.inputListener);
  }

  private onMidiEvent(event: MidiEvent) {
    if (this.disposed) return;

    const [status, control, value] = event.rawMessage.data;
    if (
      status === undefined ||
      control === undefined ||
      value === undefined ||
      value === 0
    ) {
      return;
    }

    const messageType = status & 0xf0;
    const isButtonEvent = messageType === 0x90 || messageType === 0xb0;
    if (!isButtonEvent) return;

    if (control === PLAY_CONTROL) {
      this.start();
      this.updateTransportColors();
      return;
    }

    if (control === RECORD_CONTROL) {
      this.stop();
      this.updateTransportColors();
      return;
    }
  }

  private updateTransportColors() {
    if (this.disposed) return;

    if (this.isPlaying()) {
      this.setColor(Control.Play, Color.Green15);
      this.setColor(Control.Record, Color.Red6);
      return;
    }

    this.setColor(Control.Play, Color.Green0);
    this.setColor(Control.Record, Color.Red0);
  }

  private setColor(control: Control, color: Color) {
    if (this.disposed) return;
    this.output.send([176, control, color]);
  }

  private sendBigBlibliki() {
    if (this.disposed) return;

    this.output.send([0xb6, 0x70, 0x00]);
  }
}
