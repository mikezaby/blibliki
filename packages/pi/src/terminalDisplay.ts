import type { InstrumentDisplayState } from "@blibliki/instrument";

export type TerminalDisplayWriter = {
  write: (chunk: string | Uint8Array) => unknown;
};

export type TerminalDisplaySession = {
  render: (displayState: InstrumentDisplayState) => void;
  dispose: () => void;
};

const CLEAR_SCREEN = "\u001b[2J\u001b[H";

function renderGlobalSlot(
  slot: InstrumentDisplayState["globalBand"]["slots"][number],
) {
  const label = slot.inactive ? `[${slot.shortLabel}]` : slot.shortLabel;
  const value = slot.inactive ? `[${slot.valueText}]` : slot.valueText;

  return `${label}:${value}`;
}

function renderDisplaySlot(
  slot: InstrumentDisplayState["upperBand"]["slots"][number],
) {
  if (slot.kind === "empty") {
    return "(empty):--";
  }

  const label = slot.inactive ? `[${slot.shortLabel}]` : slot.shortLabel;
  const value = slot.inactive ? `[${slot.valueText}]` : slot.valueText;

  return `${label}:${value}`;
}

function renderBand(prefix: string, band: InstrumentDisplayState["upperBand"]) {
  return `${prefix} ${band.title} | ${band.slots.map(renderDisplaySlot).join(" | ")}`;
}

export function renderInstrumentDisplayStateToTerminal(
  displayState: InstrumentDisplayState,
) {
  return [
    `INSTRUMENT ${displayState.header.instrumentName} | TRACK ${displayState.header.trackName} | CH ${displayState.header.midiChannel} | PAGE ${displayState.header.controllerPage} ${displayState.header.pageKey}`,
    `MODE ${displayState.header.mode} | TRANSPORT ${displayState.header.transportState}`,
    `GLOBAL | ${displayState.globalBand.slots.map(renderGlobalSlot).join(" | ")}`,
    renderBand("TOP", displayState.upperBand),
    renderBand("BOTTOM", displayState.lowerBand),
  ].join("\n");
}

export function createTerminalDisplaySession(
  writer: TerminalDisplayWriter = process.stdout,
): TerminalDisplaySession {
  let disposed = false;

  return {
    render(displayState) {
      if (disposed) {
        return;
      }

      writer.write(
        `${CLEAR_SCREEN}${renderInstrumentDisplayStateToTerminal(displayState)}\n`,
      );
    },
    dispose() {
      disposed = true;
    },
  };
}
