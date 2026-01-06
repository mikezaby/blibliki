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

export class LaunchControlXL3 extends BaseController {
  initialize() {
    this.exitDawMode();
    this.enterDawMode();
    this.setColor(Control.Play, Color.Green0);
    this.setColor(Control.Record, Color.Red0);
    // this.output.send([
    //   // SysEx header
    //   0xf0,
    //   0x00,
    //   0x20,
    //   0x29,
    //   0x02,
    //   0x15,
    //
    //   // Configure display (command 0x04)
    //   0x04,
    //   0x35, // target: Stationary display
    //   0x01, // config: arrangement 1 (simple 2-line display)
    //
    //   0xf7,
    // ]);
    //
    // this.output.send([
    //   // SysEx header
    //   0xf0,
    //   0x00,
    //   0x20,
    //   0x29,
    //   0x02,
    //   0x15,
    //
    //   // Set text (command 0x06)
    //   0x06,
    //   0x35, // target: Stationary display
    //   0x00, // field F0
    //
    //   // "Blibliki"
    //   0x42,
    //   0x6c,
    //   0x69,
    //   0x62,
    //   0x6c,
    //   0x69,
    //   0x6b,
    //   0x69,
    //
    //   0xf7,
    // ]);
    //
    // this.output.send([
    //   // SysEx header
    //   0xf0, 0x00, 0x20, 0x29, 0x02, 0x15,
    //
    //   // Trigger display (special config = 0x7F)
    //   0x04, 0x35, 0x7f,
    //
    //   0xf7,
    // ]);

    sendBigBlibliki(this.output);
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

export function sendBigBlibliki(output: MidiOutputDevice) {
  const W = 128,
    H = 64,
    BPR = 19; // 19 bytes/row, 64 rows => 1216 bytes

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;

  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("2D canvas not available");

  // draw text
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#fff";
  ctx.font = "900 32px system-ui, Arial"; // big + bold
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Blibliki", W / 2, H / 2 + 1);

  const img = ctx.getImageData(0, 0, W, H).data;

  // pack pixels into 1216 bytes (7 pixels per byte, bit6 is leftmost)
  const bmp = new Uint8Array(BPR * H);
  let k = 0;

  for (let y = 0; y < H; y++) {
    for (let bx = 0; bx < BPR; bx++) {
      let v = 0;
      for (let bit = 0; bit < 7; bit++) {
        const x = bx * 7 + bit;
        if (x >= W) continue;

        const i = (y * W + x) * 4;
        const on = img[i]! + img[i + 1]! + img[i + 2]! > 30; // simple threshold
        if (on) v |= 0x40 >> bit;
      }
      bmp[k++] = v; // always 0..127
    }
  }

  // SysEx: F0 00 20 29 02 15 09 <target> <1216 bytes> 7F F7
  // target per your doc: 0x20 stationary bitmap, 0x21 global temp bitmap
  const msg: number[] = [
    0xf0,
    0x00,
    0x20,
    0x29,
    0x02,
    0x15,
    0x09,
    0x20,
    ...bmp,
    0x7f,
    0xf7,
  ];

  output.send(msg);
}

// usage:
// sendBigBlibliki(this.output);
