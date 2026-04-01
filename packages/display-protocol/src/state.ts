export type DisplayOrientation = "landscape";

export type DisplayTargetClass = "standard" | "compact-standard";

export type DisplayTransportState = "PLAY" | "STOP";

export type DisplayMode = "PERF" | "SEQ";

export type DisplayBandKey = "global" | "upper" | "lower";

export type DisplayVisualScale = "linear" | "log";

export type DisplayCellVisual = {
  normalized: number | null;
  scale: DisplayVisualScale;
};

export type DisplayNumberCellValue = {
  kind: "number";
  raw: number;
  formatted: string;
  visualNormalized: number | null;
  visualScale: DisplayVisualScale;
};

export type DisplayEnumCellValue = {
  kind: "enum";
  raw: string;
  formatted: string;
  visualNormalized: number | null;
  visualScale: DisplayVisualScale;
};

export type DisplayBooleanCellValue = {
  kind: "boolean";
  raw: boolean;
  formatted: string;
  visualNormalized: number | null;
  visualScale: DisplayVisualScale;
};

export type DisplayTextCellValue = {
  kind: "text";
  raw: string;
  formatted: string;
  visualNormalized: null;
  visualScale: DisplayVisualScale;
};

export type DisplayCellValue =
  | DisplayNumberCellValue
  | DisplayEnumCellValue
  | DisplayBooleanCellValue
  | DisplayTextCellValue;

export type DisplayHeaderState = {
  left: string;
  center: string;
  right: string;
  transport: DisplayTransportState;
  mode: DisplayMode;
};

export type DisplayCellState = {
  key: string;
  label: string;
  inactive: boolean;
  empty: boolean;
  value: DisplayCellValue;
};

export type DisplayBandState = {
  key: DisplayBandKey;
  title: string;
  cells: DisplayCellState[];
};

export type DisplayProtocolState = {
  revision: number;
  screen: {
    orientation: DisplayOrientation;
    targetClass: DisplayTargetClass;
  };
  header: DisplayHeaderState;
  bands: DisplayBandState[];
};
