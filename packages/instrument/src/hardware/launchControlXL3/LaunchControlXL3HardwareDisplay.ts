import { MidiEvent } from "@blibliki/engine";
import type { InstrumentDisplayState } from "@/display/InstrumentDisplayState";
import type { TrackPageKey } from "@/types";

const SYSEX_HEADER = [0xf0, 0x00, 0x20, 0x29, 0x02, 0x15];
const OVERLAY_TARGET = 0x36;
const CMD_CONFIGURE = 0x04;
const CMD_SET_TEXT = 0x06;
const CANCEL = 0x00;
const ARRANGE_2_LINES = 0x01;
const ARRANGE_3_LINES = 0x02;
const ARRANGE_TITLE_AND_NAMES = 0x03;
const TRIGGER = 0x7f;
const CHEATSHEET_CELLS = 8;

// Analog-control temp-display targets (faders 0x05-0x0C, encoders 0x0D-0x24).
// Same indices as their CC numbers.
const ANALOG_TARGET_START = 0x05;
const ANALOG_TARGET_END = 0x24;
// Default analog arrangement (2 lines: name + numeric value). Non-zero keeps a
// valid arrangement while bits 5 & 6 (auto temp-display on touch/change) stay
// cleared, so the hardware stops popping its own raw-value display over ours.
const ARRANGE_NUMERIC_NO_AUTO = 0x04;

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

/**
 * One-time setup: disable the hardware's automatic per-encoder/fader temp
 * display so it doesn't flicker its raw MIDI value over our overlay.
 */
export function disableAnalogAutoDisplayEvents(): MidiEvent[] {
  const events: MidiEvent[] = [];
  for (
    let target = ANALOG_TARGET_START;
    target <= ANALOG_TARGET_END;
    target++
  ) {
    events.push(buildSysEx(CMD_CONFIGURE, [target, ARRANGE_NUMERIC_NO_AUTO]));
  }
  return events;
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

// Configure the overlay (arrangement from line count), fill each field, trigger.
function overlayEvents(...lines: string[]): MidiEvent[] {
  return [
    configure(lines.length === 3 ? ARRANGE_3_LINES : ARRANGE_2_LINES),
    ...lines.map((text, field) => setText(field, text)),
    configure(TRIGGER),
  ];
}

export function encoderDisplayEvents(
  displayState: InstrumentDisplayState,
  cc: number,
): MidiEvent[] | null {
  // In Step Edit every row belongs to the held steps (or the defaults), which
  // the band section names.
  const stepEditFocus =
    displayState.header.mode === "seqEdit"
      ? displayState.upperBand.sections[0]?.label
      : undefined;
  const globalSlot = displayState.globalBand.slots.find((s) => s.cc === cc);
  if (globalSlot) {
    return overlayEvents(
      stepEditFocus ?? "Global",
      globalSlot.label,
      globalSlot.valueText,
    );
  }

  for (const band of [displayState.upperBand, displayState.lowerBand]) {
    const slot = band.slots.find((s) => s.kind === "slot" && s.cc === cc);
    if (slot?.kind === "slot") {
      return overlayEvents(
        stepEditFocus ?? titleCase(slot.blockKey),
        slot.label,
        slot.valueText,
      );
    }
  }

  return null;
}

// The title plus 2x4 names layout: the mode, then one hint per cell.
export function cheatsheetDisplayEvents(
  displayState: InstrumentDisplayState,
): MidiEvent[] | null {
  // Shown while Shift is held, so the Shift combinations come first.
  const isShiftCombo = (gesture: string) => gesture.startsWith("[Shift] +");
  const hints = [...(displayState.hints ?? [])].sort(
    (a, b) => Number(isShiftCombo(b.gesture)) - Number(isShiftCombo(a.gesture)),
  );
  if (hints.length === 0) {
    return null;
  }

  const title =
    displayState.header.mode === "seqEdit" ? "STEP EDIT" : "PERFORMANCE";

  return [
    configure(ARRANGE_TITLE_AND_NAMES),
    setText(0, title),
    ...hints
      .slice(0, CHEATSHEET_CELLS)
      .map((hint, index) => setText(index + 1, hint.oled)),
    configure(TRIGGER),
  ];
}

export function cancelOverlayEvents(): MidiEvent[] {
  return [configure(CANCEL)];
}

export function navigationDisplayEvents(
  displayState: InstrumentDisplayState,
): MidiEvent[] {
  const { trackName, pageKey } = displayState.header;
  return overlayEvents(trackName, PAGE_KEY_LABELS[pageKey]);
}
