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
  private animationDelayTimer?: ReturnType<typeof setTimeout>;
  private animationStepTimer?: ReturnType<typeof setInterval>;
  private displayFadeTimer?: ReturnType<typeof setInterval>;

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

    this.clearAnimationTimers();

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
    this.animateColors();
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

  private animateColors() {
    if (this.disposed) return;

    this.clearAnimationTimers();

    const columns = [
      [
        Control.Encoder0_0,
        Control.Encoder1_0,
        Control.Encoder2_0,
        Control.ChannelButton0_0,
        Control.ChannelButton1_0,
      ],
      [
        Control.Encoder0_1,
        Control.Encoder1_1,
        Control.Encoder2_1,
        Control.ChannelButton0_1,
        Control.ChannelButton1_1,
      ],
      [
        Control.Encoder0_2,
        Control.Encoder1_2,
        Control.Encoder2_2,
        Control.ChannelButton0_2,
        Control.ChannelButton1_2,
      ],
      [
        Control.Encoder0_3,
        Control.Encoder1_3,
        Control.Encoder2_3,
        Control.ChannelButton0_3,
        Control.ChannelButton1_3,
      ],
      [
        Control.Encoder0_4,
        Control.Encoder1_4,
        Control.Encoder2_4,
        Control.ChannelButton0_4,
        Control.ChannelButton1_4,
      ],
      [
        Control.Encoder0_5,
        Control.Encoder1_5,
        Control.Encoder2_5,
        Control.ChannelButton0_5,
        Control.ChannelButton1_5,
      ],
      [
        Control.Encoder0_6,
        Control.Encoder1_6,
        Control.Encoder2_6,
        Control.ChannelButton0_6,
        Control.ChannelButton1_6,
      ],
      [
        Control.Encoder0_7,
        Control.Encoder1_7,
        Control.Encoder2_7,
        Control.ChannelButton0_7,
        Control.ChannelButton1_7,
      ],
    ];

    const colors = [
      Color.Red5,
      Color.Orange5,
      Color.Yellow5,
      Color.Green10,
      Color.Cyan5,
      Color.Blue3,
      Color.Purple3,
      Color.Pink5,
    ];

    columns.forEach((column) => {
      column.forEach((ctrl) => {
        this.setColor(ctrl, Color.Gray0);
      });
    });
    this.setColor(Control.Play, Color.Gray0);
    this.setColor(Control.Record, Color.Gray0);

    this.animationDelayTimer = setTimeout(() => {
      if (this.disposed) return;

      let step = 0;
      this.animationStepTimer = setInterval(() => {
        if (this.disposed) return;

        columns.forEach((column, col) => {
          const colorIdx = (step + col) % colors.length;
          const color = colors[colorIdx];
          if (color === undefined) return;

          column.forEach((ctrl) => {
            this.setColor(ctrl, color);
          });
        });

        step++;
        if (step >= 10) {
          this.clearAnimationStepTimer();
          columns.forEach((column, col) => {
            const color = colors[col];
            if (color === undefined) return;

            column.forEach((ctrl) => {
              this.setColor(ctrl, color);
            });
          });
          this.updateTransportColors();
          this.sendBigBlibliki();
        }
      }, 100);
    }, 1000);
  }

  private setColor(control: Control, color: Color) {
    if (this.disposed) return;
    this.output.send([176, control, color]);
  }

  private clearAnimationDelayTimer() {
    if (this.animationDelayTimer === undefined) return;
    clearTimeout(this.animationDelayTimer);
    this.animationDelayTimer = undefined;
  }

  private clearAnimationStepTimer() {
    if (this.animationStepTimer === undefined) return;
    clearInterval(this.animationStepTimer);
    this.animationStepTimer = undefined;
  }

  private clearDisplayFadeTimer() {
    if (this.displayFadeTimer === undefined) return;
    clearInterval(this.displayFadeTimer);
    this.displayFadeTimer = undefined;
  }

  private clearAnimationTimers() {
    this.clearAnimationDelayTimer();
    this.clearAnimationStepTimer();
    this.clearDisplayFadeTimer();
  }

  private sendBigBlibliki() {
    if (this.disposed) return;

    this.output.send([0xb6, 0x70, 0x00]);

    let brightness = 0;
    this.displayFadeTimer = setInterval(() => {
      if (this.disposed) return;

      brightness += 8;
      if (brightness > 127) brightness = 127;

      this.output.send([0xb6, 0x70, brightness]);

      if (brightness >= 127) {
        this.clearDisplayFadeTimer();
      }
    }, 60);
  }
}
