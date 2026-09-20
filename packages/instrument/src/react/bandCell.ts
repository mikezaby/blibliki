import type { InstrumentDisplayState } from "@/display/InstrumentDisplayState";

export type BandCell =
  | InstrumentDisplayState["globalBand"]["slots"][number]
  | InstrumentDisplayState["upperBand"]["slots"][number];

export type BandKey = "global" | "upper" | "lower";

type CellVisualValue = {
  kind: "number" | "enum" | "boolean" | "text";
  visualNormalized: number | null;
  // Position (0..1) the fill arc anchors at. Defaults to 0 (fill from min); a
  // bipolar range (min < 0 < max) anchors at the zero value so the arc fills
  // as a band from center toward the value.
  anchorNormalized?: number;
  showEncoder: boolean;
  empty: boolean;
};

const EMPTY_SLOT_TEXT = "--";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function renderCellValue(slot: BandCell) {
  if ("kind" in slot && slot.kind === "empty") {
    return EMPTY_SLOT_TEXT;
  }

  return slot.valueText;
}

export function renderCellLabel(slot: BandCell) {
  if ("kind" in slot && slot.kind === "empty") {
    return EMPTY_SLOT_TEXT;
  }

  return slot.shortLabel;
}

function isEmptyCell(slot: BandCell) {
  return "kind" in slot && slot.kind === "empty";
}

export function isInactiveCell(slot: BandCell) {
  if (isEmptyCell(slot)) {
    return true;
  }

  return slot.inactive === true;
}

function normalizeNumericValue(value: number) {
  if (value >= 20 && value <= 20000) {
    return clamp(
      (Math.log10(value) - Math.log10(20)) /
        (Math.log10(20000) - Math.log10(20)),
      0,
      1,
    );
  }

  if (value >= 0 && value <= 1) {
    return value;
  }

  if (value >= 0 && value <= 100) {
    return value / 100;
  }

  if (value >= 0 && value <= 127) {
    return value / 127;
  }

  return 0.5;
}

export function parseCellVisualValue(slot: BandCell): CellVisualValue {
  if (isEmptyCell(slot)) {
    return {
      kind: "text",
      visualNormalized: null,
      showEncoder: true,
      empty: true,
    };
  }

  const valueText = renderCellValue(slot);
  const trimmedValue = valueText.trim();
  if (trimmedValue === EMPTY_SLOT_TEXT) {
    return {
      kind: "text",
      visualNormalized: null,
      showEncoder: false,
      empty: false,
    };
  }

  if (
    slot.valueSpec?.kind === "boolean" &&
    typeof slot.rawValue === "boolean"
  ) {
    return {
      kind: "boolean",
      visualNormalized: slot.rawValue ? 1 : 0,
      showEncoder: false,
      empty: false,
    };
  }

  if (
    slot.valueSpec?.kind === "enum" &&
    (typeof slot.rawValue === "string" || typeof slot.rawValue === "number")
  ) {
    const optionIndex = slot.valueSpec.options.findIndex(
      (option) => option === slot.rawValue,
    );
    const optionCount = slot.valueSpec.options.length;

    return {
      kind: "enum",
      visualNormalized:
        optionIndex < 0 || optionCount <= 1
          ? 0.5
          : optionIndex / (optionCount - 1),
      showEncoder: false,
      empty: false,
    };
  }

  if (slot.valueSpec?.kind === "number" && typeof slot.rawValue === "number") {
    const { min, max, exp } = slot.valueSpec;
    if (min !== undefined && max !== undefined && min !== max) {
      const applyExp = (n: number) =>
        exp !== undefined && exp !== 1 ? Math.pow(n, 1 / exp) : n;
      const normalized = clamp((slot.rawValue - min) / (max - min), 0, 1);
      const bipolar = min < 0 && max > 0;

      return {
        kind: "number",
        visualNormalized: applyExp(normalized),
        anchorNormalized: bipolar ? applyExp((0 - min) / (max - min)) : 0,
        showEncoder: true,
        empty: false,
      };
    }

    return {
      kind: "number",
      visualNormalized: normalizeNumericValue(slot.rawValue),
      showEncoder: true,
      empty: false,
    };
  }

  const normalizedText = trimmedValue.toUpperCase();
  if (normalizedText === "ON" || normalizedText === "OFF") {
    return {
      kind: "boolean",
      visualNormalized: normalizedText === "ON" ? 1 : 0,
      showEncoder: false,
      empty: false,
    };
  }

  const percentMatch = trimmedValue.match(/^(-?\d+(?:\.\d+)?)%$/);
  if (percentMatch) {
    return {
      kind: "number",
      visualNormalized: clamp(Number(percentMatch[1]) / 100, 0, 1),
      showEncoder: true,
      empty: false,
    };
  }

  const bpmMatch = trimmedValue.match(/^(-?\d+(?:\.\d+)?)\s*BPM$/i);
  if (bpmMatch) {
    return {
      kind: "number",
      visualNormalized: clamp(Number(bpmMatch[1]) / 240, 0, 1),
      showEncoder: true,
      empty: false,
    };
  }

  const numericValue = Number(trimmedValue);
  if (Number.isFinite(numericValue)) {
    return {
      kind: "number",
      visualNormalized: normalizeNumericValue(numericValue),
      showEncoder: true,
      empty: false,
    };
  }

  return {
    kind: "enum",
    visualNormalized: 0.5,
    showEncoder: false,
    empty: false,
  };
}

export function getCellCc(slot: BandCell) {
  return "cc" in slot ? slot.cc : undefined;
}

export function getCellKey(slot: BandCell, bandKey: BandKey, index: number) {
  if (isEmptyCell(slot)) {
    return `${bandKey}-${index}`;
  }

  if ("blockKey" in slot) {
    return `${slot.blockKey}.${slot.slotKey}`;
  }

  return `global.${slot.key}`;
}
