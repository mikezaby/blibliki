import MidiEvent from "../MidiEvent";
import MidiOutputDevice from "../MidiOutputDevice";
import { BaseController } from "./BaseController";

enum Color {
  // ===== GRAYS =====
  Gray0 = 0,
  Gray1 = 1,
  Gray2 = 2,
  Gray3 = 3,
  Gray4 = 70,
  Gray5 = 71,
  Gray6 = 91,
  Gray7 = 103,
  Gray8 = 115,
  Gray9 = 116,
  Gray10 = 117,
  Gray11 = 118,
  Gray12 = 119,

  // ===== REDS =====
  Red0 = 4,
  Red1 = 5,
  Red2 = 6,
  Red3 = 7,
  Red4 = 72,
  Red5 = 106,
  Red6 = 120,

  // ===== ORANGES =====
  Orange0 = 8,
  Orange1 = 9,
  Orange2 = 10,
  Orange3 = 11,
  Orange4 = 84,
  Orange5 = 96,
  Orange6 = 107,
  Orange7 = 108,
  Orange8 = 121,
  Orange9 = 126,

  // ===== YELLOWS =====
  Yellow0 = 12,
  Yellow1 = 13,
  Yellow2 = 14,
  Yellow3 = 15,
  Yellow4 = 73,
  Yellow5 = 74,
  Yellow6 = 75,
  Yellow7 = 85,
  Yellow8 = 97,
  Yellow9 = 98,
  Yellow10 = 99,
  Yellow11 = 109,
  Yellow12 = 113,
  Yellow13 = 124,
  Yellow14 = 125,

  // ===== GREENS =====
  Green0 = 16,
  Green1 = 17,
  Green2 = 18,
  Green3 = 19,
  Green4 = 20,
  Green5 = 21,
  Green6 = 22,
  Green7 = 23,
  Green8 = 64,
  Green9 = 65,
  Green10 = 76,
  Green11 = 86,
  Green12 = 87,
  Green13 = 88,
  Green14 = 89,
  Green15 = 101,
  Green16 = 102,
  Green17 = 110,
  Green18 = 111,
  Green19 = 114,
  Green20 = 122,
  Green21 = 123,

  // ===== TEALS =====
  Teal0 = 24,
  Teal1 = 25,
  Teal2 = 26,
  Teal3 = 27,
  Teal4 = 28,
  Teal5 = 29,
  Teal6 = 30,
  Teal7 = 31,
  Teal8 = 68,
  Teal9 = 69,

  // ===== CYANS =====
  Cyan0 = 32,
  Cyan1 = 33,
  Cyan2 = 34,
  Cyan3 = 35,
  Cyan4 = 36,
  Cyan5 = 37,
  Cyan6 = 38,
  Cyan7 = 39,
  Cyan8 = 66,
  Cyan9 = 67,
  Cyan10 = 77,
  Cyan11 = 78,
  Cyan12 = 90,

  // ===== BLUES =====
  Blue0 = 40,
  Blue1 = 41,
  Blue2 = 42,
  Blue3 = 43,
  Blue4 = 79,
  Blue5 = 92,

  // ===== INDIGOS =====
  Indigo0 = 44,
  Indigo1 = 45,
  Indigo2 = 46,
  Indigo3 = 47,
  Indigo4 = 104,
  Indigo5 = 112,

  // ===== PURPLES =====
  Purple0 = 48,
  Purple1 = 49,
  Purple2 = 50,
  Purple3 = 51,
  Purple4 = 80,
  Purple5 = 81,
  Purple6 = 93,

  // ===== PINKS =====
  Pink0 = 52,
  Pink1 = 53,
  Pink2 = 54,
  Pink3 = 55,
  Pink4 = 56,
  Pink5 = 57,
  Pink6 = 58,
  Pink7 = 59,
  Pink8 = 82,
  Pink9 = 94,
  Pink10 = 95,

  // ===== BROWNS =====
  Brown0 = 60,
  Brown1 = 61,
  Brown2 = 62,
  Brown3 = 63,
  Brown4 = 83,
  Brown5 = 100,
  Brown6 = 105,
  Brown7 = 127,
}

enum Control {
  // ===== ENCODERS =====
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

  // ===== FADERS =====
  Fader0 = 5,
  Fader1 = 6,
  Fader2 = 7,
  Fader3 = 8,
  Fader4 = 9,
  Fader5 = 10,
  Fader6 = 11,
  Fader7 = 12,

  // ===== CHANNEL BUTTONS =====
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

  // ===== TRANSPORT =====
  Play = 116,
  Record = 118,

  // ===== NAVIGATION =====
  PageUp = 106,
  PageDown = 107,
  TrackPrev = 103,
  TrackNext = 102,

  // ===== MODIFIERS =====
  Shift = 63,
  Mode = 104,
}

const PLAY_CONTROL = 116;
const RECORD_CONTROL = 118;

export class LaunchControlXL3 extends BaseController {
  initialize() {
    this.bindTransportControls();
    this.exitDawMode();
    this.enterDawMode();
    this.animateColors();
  }

  private bindTransportControls() {
    this.input.addEventListener((event) => {
      void this.onMidiEvent(event);
    });
  }

  private async onMidiEvent(event: MidiEvent) {
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
      await this.start();
      this.updateTransportColors();
      return;
    }

    if (control === RECORD_CONTROL) {
      this.stop();
      this.updateTransportColors();
    }
  }

  private updateTransportColors() {
    if (this.isPlaying()) {
      this.setColor(Control.Play, Color.Green15);
      this.setColor(Control.Record, Color.Red6);
      return;
    }

    this.setColor(Control.Play, Color.Green0);
    this.setColor(Control.Record, Color.Red0);
  }

  animateColors() {
    // Define 8 columns - each column has 5 controls (3 encoders + 2 buttons)
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

    const finalColors = [
      Color.Red5,
      Color.Orange5,
      Color.Yellow5,
      Color.Green10,
      Color.Cyan5,
      Color.Blue3,
      Color.Purple3,
      Color.Pink5,
    ];

    // Turn all LEDs off
    columns.forEach((column) => {
      column.forEach((ctrl) => {
        this.setColor(ctrl, Color.Gray0);
      });
    });
    this.setColor(Control.Play, Color.Gray0);
    this.setColor(Control.Record, Color.Gray0);

    // Wait 1 second, then start animation
    setTimeout(() => {
      let step = 0;
      const interval = setInterval(() => {
        columns.forEach((column, col) => {
          const colorIdx = (step + col) % colors.length;
          column.forEach((ctrl) => {
            this.setColor(ctrl, colors[colorIdx]!);
          });
        });

        step++;
        if (step >= 24) {
          clearInterval(interval);
          // Set final colors - each column same color
          columns.forEach((column, col) => {
            column.forEach((ctrl) => {
              this.setColor(ctrl, finalColors[col]!);
            });
          });
          this.updateTransportColors();
          sendBigBlibliki(this.output);
        }
      }, 100);
    }, 1000);
  }

  enterDawMode() {
    this.output.send([159, 12, 127]);
    this.isInDawMode = true;
  }

  exitDawMode() {
    this.output.send([159, 12, 0]);
    this.isInDawMode = false;
  }

  setColor(control: Control, color: Color) {
    this.output.send([176, control, color]);
  }
}

function sendBigBlibliki(output: MidiOutputDevice) {
  // Start with screen brightness at 0
  output.send([0xb6, 0x70, 0x00]); // CC 112 on channel 7, brightness 0

  // Configure display - arrangement 1 (simple 2-line)
  output.send([0xf0, 0x00, 0x20, 0x29, 0x02, 0x15, 0x04, 0x35, 0x01, 0xf7]);

  const text = "      Blibliki      ";

  // Set the text
  output.send([
    0xf0,
    0x00,
    0x20,
    0x29,
    0x02,
    0x15,
    0x06,
    0x35,
    0x00,
    ...text.split("").map((c) => c.charCodeAt(0)),
    0xf7,
  ]);

  // Trigger display
  output.send([0xf0, 0x00, 0x20, 0x29, 0x02, 0x15, 0x04, 0x35, 0x7f, 0xf7]);

  // Fade in brightness over ~1 second
  let brightness = 0;
  const fadeInterval = setInterval(() => {
    brightness += 8;
    if (brightness > 127) brightness = 127;

    output.send([0xb6, 0x70, brightness]); // CC 112, channel 7

    if (brightness >= 127) {
      clearInterval(fadeInterval);
    }
  }, 60);
}
