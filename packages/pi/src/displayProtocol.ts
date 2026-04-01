import type {
  DisplayBandState,
  DisplayCellValue,
  DisplayProtocolState,
  DisplayVisualScale,
} from "@blibliki/display-protocol";
import { TransportState } from "@blibliki/engine";
import type { InstrumentDisplayState } from "@blibliki/instrument";

const EMPTY_VALUE_TEXT = "--";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeNumericValue(value: number) {
  if (value >= 20 && value <= 20000) {
    return {
      normalized: clamp(
        (Math.log10(value) - Math.log10(20)) /
          (Math.log10(20000) - Math.log10(20)),
        0,
        1,
      ),
      scale: "log" as DisplayVisualScale,
    };
  }

  if (value >= 0 && value <= 1) {
    return {
      normalized: value,
      scale: "linear" as DisplayVisualScale,
    };
  }

  if (value >= 0 && value <= 100) {
    return {
      normalized: value / 100,
      scale: "linear" as DisplayVisualScale,
    };
  }

  if (value >= 0 && value <= 127) {
    return {
      normalized: value / 127,
      scale: "linear" as DisplayVisualScale,
    };
  }

  return {
    normalized: 0.5,
    scale: "linear" as DisplayVisualScale,
  };
}

function parseDisplayValue(valueText: string): DisplayCellValue {
  const trimmed = valueText.trim();
  if (trimmed === EMPTY_VALUE_TEXT) {
    return {
      kind: "text",
      raw: trimmed,
      formatted: valueText,
      visualNormalized: null,
      visualScale: "linear",
    };
  }

  const normalizedText = trimmed.toUpperCase();
  if (normalizedText === "ON" || normalizedText === "OFF") {
    return {
      kind: "boolean",
      raw: normalizedText === "ON",
      formatted: valueText,
      visualNormalized: normalizedText === "ON" ? 1 : 0,
      visualScale: "linear",
    };
  }

  const percentMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (percentMatch) {
    const raw = Number(percentMatch[1]);
    return {
      kind: "number",
      raw,
      formatted: valueText,
      visualNormalized: clamp(raw / 100, 0, 1),
      visualScale: "linear",
    };
  }

  const bpmMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*BPM$/i);
  if (bpmMatch) {
    const raw = Number(bpmMatch[1]);
    return {
      kind: "number",
      raw,
      formatted: valueText,
      visualNormalized: clamp(raw / 240, 0, 1),
      visualScale: "linear",
    };
  }

  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    const normalized = normalizeNumericValue(numeric);
    return {
      kind: "number",
      raw: numeric,
      formatted: valueText,
      visualNormalized: normalized.normalized,
      visualScale: normalized.scale,
    };
  }

  return {
    kind: "enum",
    raw: trimmed,
    formatted: valueText,
    visualNormalized: 0.5,
    visualScale: "linear",
  };
}

function getPageSummary(displayState: InstrumentDisplayState) {
  return `Page ${displayState.header.controllerPage}: ${displayState.upperBand.title} / ${displayState.lowerBand.title}`;
}

function mapGlobalBand(
  displayState: InstrumentDisplayState,
): DisplayBandState {
  return {
    key: "global",
    title: "GLOBAL",
    cells: displayState.globalBand.slots.map((slot) => ({
      key: slot.key,
      label: slot.shortLabel,
      inactive: slot.inactive ?? false,
      empty: false,
      value: parseDisplayValue(slot.valueText),
    })),
  };
}

function mapDisplayBand(
  key: DisplayBandState["key"],
  band: InstrumentDisplayState["upperBand"],
): DisplayBandState {
  return {
    key,
    title: band.title,
    cells: band.slots.map((slot, index) => {
      if (slot.kind === "empty") {
        return {
          key: `${key}-${index}`,
          label: EMPTY_VALUE_TEXT,
          inactive: false,
          empty: true,
          value: parseDisplayValue(EMPTY_VALUE_TEXT),
        };
      }

      return {
        key: `${slot.blockKey}.${slot.slotKey}`,
        label: slot.shortLabel,
        inactive: slot.inactive ?? false,
        empty: false,
        value: parseDisplayValue(slot.valueText),
      };
    }),
  };
}

export function instrumentDisplayStateToProtocol(
  displayState: InstrumentDisplayState,
  revision = 0,
): DisplayProtocolState {
  return {
    revision,
    screen: {
      orientation: "landscape",
      targetClass: "standard",
    },
    header: {
      left: displayState.header.instrumentName,
      center: displayState.header.trackName,
      right: getPageSummary(displayState),
      transport:
        displayState.header.transportState === TransportState.playing
          ? "PLAY"
          : "STOP",
      mode: displayState.header.mode === "seqEdit" ? "SEQ" : "PERF",
    },
    bands: [
      mapGlobalBand(displayState),
      mapDisplayBand("upper", displayState.upperBand),
      mapDisplayBand("lower", displayState.lowerBand),
    ],
  };
}
