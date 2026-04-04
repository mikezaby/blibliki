import type { InstrumentDisplayState } from "@blibliki/instrument";

export type TerminalDisplayWriter = {
  write: (chunk: string | Uint8Array) => unknown;
};

export type TerminalDisplaySession = {
  render: (displayState: InstrumentDisplayState) => void;
  dispose: () => void;
};

const CLEAR_SCREEN = "\u001b[2J\u001b[H";
const CELL_WIDTH = 9;
const EMPTY_TEXT = "--";
const EMPTY_VISUAL = "----";

type TerminalBandCell = {
  label: string;
  value: string;
  visual: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function padCell(value: string) {
  return value.length > CELL_WIDTH
    ? value.slice(0, CELL_WIDTH)
    : value.padEnd(CELL_WIDTH, " ");
}

function renderCellRow(values: string[]) {
  return `| ${values.map((value) => padCell(value)).join(" | ")} |`;
}

function renderBorder(row: string) {
  return `+${"-".repeat(row.length - 2)}+`;
}

function renderTitleRow(title: string, row: string) {
  const contentWidth = row.length - 4;
  const normalizedTitle =
    title.length > contentWidth ? title.slice(0, contentWidth) : title;

  return `| ${normalizedTitle.padEnd(contentWidth, " ")} |`;
}

function renderNoticeRow(
  displayState: InstrumentDisplayState,
  row: string,
): string | null {
  if (!displayState.notice) {
    return null;
  }

  const content = displayState.notice.message
    ? `${displayState.notice.title} | ${displayState.notice.message}`
    : displayState.notice.title;

  return renderTitleRow(content, row);
}

function createIndicator(position: number) {
  return Array.from({ length: 4 }, (_, index) =>
    index === position ? "o" : "-",
  ).join("");
}

function normalizeNumericValue(value: number) {
  if (value >= 0 && value <= 1) {
    return value;
  }

  if (value >= -1 && value <= 1) {
    return (value + 1) / 2;
  }

  if (value >= 0 && value <= 100) {
    return value / 100;
  }

  if (value >= 0 && value <= 127) {
    return value / 127;
  }

  if (value >= 20 && value <= 20000) {
    return clamp(
      (Math.log10(value) - Math.log10(20)) /
        (Math.log10(20000) - Math.log10(20)),
      0,
      1,
    );
  }

  return 0.5;
}

function createEncoderVisual(valueText: string, inactive = false) {
  if (inactive || valueText === EMPTY_TEXT || valueText === `[${EMPTY_TEXT}]`) {
    return EMPTY_VISUAL;
  }

  const normalizedText = valueText.trim().toUpperCase();
  if (normalizedText === "ON") {
    return createIndicator(3);
  }

  if (normalizedText === "OFF") {
    return createIndicator(0);
  }

  const percentMatch = normalizedText.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (percentMatch) {
    const percent = Number(percentMatch[1]);
    const position = Math.round(clamp(percent / 100, 0, 1) * 3);
    return createIndicator(position);
  }

  const numericValue = Number.parseFloat(normalizedText);
  if (Number.isFinite(numericValue)) {
    const position = Math.round(normalizeNumericValue(numericValue) * 3);
    return createIndicator(position);
  }

  return createIndicator(2);
}

function renderBand(title: string, cells: TerminalBandCell[]) {
  const labelRow = renderCellRow(cells.map((cell) => cell.label));
  const border = renderBorder(labelRow);

  return [
    border,
    renderTitleRow(title, labelRow),
    labelRow,
    renderCellRow(cells.map((cell) => cell.value)),
    renderCellRow(cells.map((cell) => cell.visual)),
  ].join("\n");
}

function renderGlobalSlot(
  slot: InstrumentDisplayState["globalBand"]["slots"][number],
): TerminalBandCell {
  return {
    label: slot.inactive ? `[${slot.shortLabel}]` : slot.shortLabel,
    value: slot.inactive ? `[${slot.valueText}]` : slot.valueText,
    visual: createEncoderVisual(slot.valueText, slot.inactive),
  };
}

function renderDisplaySlot(
  slot: InstrumentDisplayState["upperBand"]["slots"][number],
): TerminalBandCell {
  if (slot.kind === "empty") {
    return {
      label: EMPTY_TEXT,
      value: EMPTY_TEXT,
      visual: EMPTY_VISUAL,
    };
  }

  return {
    label: slot.inactive ? `[${slot.shortLabel}]` : slot.shortLabel,
    value: slot.inactive ? `[${slot.valueText}]` : slot.valueText,
    visual: createEncoderVisual(slot.valueText, slot.inactive),
  };
}

function getPageSummary(displayState: InstrumentDisplayState) {
  return `PAGE ${displayState.header.controllerPage} ${displayState.upperBand.title} / ${displayState.lowerBand.title}`;
}

export function renderInstrumentDisplayStateToTerminal(
  displayState: InstrumentDisplayState,
) {
  const globalCells = displayState.globalBand.slots.map(renderGlobalSlot);
  const upperCells = displayState.upperBand.slots.map(renderDisplaySlot);
  const lowerCells = displayState.lowerBand.slots.map(renderDisplaySlot);
  const baseRow = renderCellRow(globalCells.map((cell) => cell.label));
  const headerText =
    `${displayState.header.instrumentName} | ` +
    `TRACK ${displayState.header.trackName} | ` +
    `${getPageSummary(displayState)} | ` +
    `${displayState.header.transportState.toUpperCase()} | ` +
    displayState.header.mode.toUpperCase();

  const noticeRow = renderNoticeRow(displayState, baseRow);

  return [
    renderBorder(baseRow),
    renderTitleRow(headerText, baseRow),
    ...(noticeRow ? [noticeRow] : []),
    renderBand("GLOBAL", globalCells),
    renderBand(displayState.upperBand.title, upperCells),
    renderBand(displayState.lowerBand.title, lowerCells),
    renderBorder(baseRow),
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
