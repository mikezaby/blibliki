import { MidiEvent } from "@blibliki/engine";
import type { InstrumentDisplayState } from "@/display/InstrumentDisplayState";
import type { TrackPageKey } from "@/types";

const SYSEX_HEADER = [0xf0, 0x00, 0x20, 0x29, 0x02, 0x15];
const OVERLAY_TARGET = 0x36;
const CMD_CONFIGURE = 0x04;
const CMD_SET_TEXT = 0x06;
const ARRANGE_2_LINES = 0x01;
const ARRANGE_3_LINES = 0x02;
const TRIGGER = 0x7f;

const PAGE_KEY_LABELS: Record<TrackPageKey, string> = {
  sourceAmp: "Source/Amp",
  filterMod: "Filter/Mod",
  fx: "FX",
};

function buildSysEx(command: number, data: number[]): MidiEvent {
  return MidiEvent.fromSysEx(
    new Uint8Array([...SYSEX_HEADER, command, ...data, 0xf7]),
  );
}

function configure(config: number): MidiEvent {
  return buildSysEx(CMD_CONFIGURE, [OVERLAY_TARGET, config]);
}

function setText(field: number, text: string): MidiEvent {
  const chars = Array.from(text.slice(0, 12)).map((c) => {
    const code = c.charCodeAt(0);
    return code >= 0x20 && code <= 0x7e ? code : 0x20;
  });
  return buildSysEx(CMD_SET_TEXT, [OVERLAY_TARGET, field, ...chars]);
}

function titleCase(s: string): string {
  return s
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}

export function encoderDisplayEvents(
  displayState: InstrumentDisplayState,
  cc: number,
): MidiEvent[] | null {
  const globalSlot = displayState.globalBand.slots.find((s) => s.cc === cc);
  if (globalSlot) {
    return [
      configure(ARRANGE_3_LINES),
      setText(0, "Global"),
      setText(1, globalSlot.label),
      setText(2, globalSlot.valueText),
      configure(TRIGGER),
    ];
  }

  for (const band of [displayState.upperBand, displayState.lowerBand]) {
    const slot = band.slots.find((s) => s.kind === "slot" && s.cc === cc);
    if (slot?.kind === "slot") {
      return [
        configure(ARRANGE_3_LINES),
        setText(0, titleCase(slot.blockKey)),
        setText(1, slot.label),
        setText(2, slot.valueText),
        configure(TRIGGER),
      ];
    }
  }

  return null;
}

export function navigationDisplayEvents(
  displayState: InstrumentDisplayState,
): MidiEvent[] {
  const { trackName, pageKey } = displayState.header;
  return [
    configure(ARRANGE_2_LINES),
    setText(0, trackName),
    setText(1, PAGE_KEY_LABELS[pageKey]),
    configure(TRIGGER),
  ];
}
