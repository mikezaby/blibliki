import type {
  DisplayBandKey,
  DisplayProtocolState,
} from "@blibliki/display-protocol";

export type DashboardCellViewModel = {
  key: string;
  label: string;
  value: string;
  visualNormalized: number | null;
  showEncoder: boolean;
  encoderArcPath: string;
  inactive: boolean;
  empty: boolean;
  accent: boolean;
};

export type DashboardBandViewModel = {
  key: DisplayBandKey;
  title: string;
  cells: DashboardCellViewModel[];
};

export type DashboardViewModel = {
  layout: {
    targetClass: DisplayProtocolState["screen"]["targetClass"];
    compact: boolean;
    width: number;
    height: number;
  };
  header: {
    left: string;
    center: string;
    right: string;
    transport: string;
    mode: string;
  };
  bands: DashboardBandViewModel[];
};

const EMPTY_SLOT_TEXT = "--";
const VISIBLE_SLOT_COUNT = 8;
const ENCODER_CENTER = 32;
const ENCODER_TRACK_RADIUS = 26;
const ENCODER_START_ANGLE = 135;
const ENCODER_SWEEP_ANGLE = 270;

function clampNormalized(normalized: number | null) {
  if (normalized === null) {
    return null;
  }

  return Math.max(0, Math.min(1, normalized));
}

function toRadians(angle: number) {
  return (angle * Math.PI) / 180;
}

function createEncoderPoint(radius: number, angle: number) {
  const radians = toRadians(angle);
  return {
    x: ENCODER_CENTER + radius * Math.cos(radians),
    y: ENCODER_CENTER + radius * Math.sin(radians),
  };
}

function formatPointValue(value: number) {
  return value.toFixed(2);
}

function createEncoderArcPath(normalized: number | null, empty: boolean) {
  const safeNormalized = clampNormalized(normalized);
  if (empty || safeNormalized === null || safeNormalized <= 0) {
    return "";
  }

  const start = createEncoderPoint(ENCODER_TRACK_RADIUS, ENCODER_START_ANGLE);
  const endAngle = ENCODER_START_ANGLE + safeNormalized * ENCODER_SWEEP_ANGLE;
  const end = createEncoderPoint(ENCODER_TRACK_RADIUS, endAngle);
  const largeArc = safeNormalized > 2 / 3 ? 1 : 0;

  return `M ${formatPointValue(start.x)} ${formatPointValue(start.y)} A ${ENCODER_TRACK_RADIUS} ${ENCODER_TRACK_RADIUS} 0 ${largeArc} 1 ${formatPointValue(end.x)} ${formatPointValue(end.y)}`;
}

function isAccentBand(key: DisplayBandKey) {
  return key === "upper";
}

function formatCellValue(
  cell: DisplayProtocolState["bands"][number]["cells"][number],
) {
  if (cell.key === "tempo") {
    return String(cell.value.raw);
  }

  return cell.value.formatted;
}

function shouldShowEncoder(
  cell: DisplayProtocolState["bands"][number]["cells"][number],
) {
  return cell.empty || cell.value.kind === "number";
}

function createEmptyCell(key: string): DashboardCellViewModel {
  return {
    key,
    label: EMPTY_SLOT_TEXT,
    value: EMPTY_SLOT_TEXT,
    visualNormalized: null,
    showEncoder: true,
    encoderArcPath: "",
    inactive: false,
    empty: true,
    accent: false,
  };
}

function padBandCells(
  cells: DashboardCellViewModel[],
  bandKey: DisplayBandKey,
) {
  if (cells.length >= VISIBLE_SLOT_COUNT) {
    return cells;
  }

  return [
    ...cells,
    ...Array.from({ length: VISIBLE_SLOT_COUNT - cells.length }, (_, index) =>
      createEmptyCell(`${bandKey}-empty-${cells.length + index}`),
    ),
  ];
}

function createLayout(
  targetClass: DisplayProtocolState["screen"]["targetClass"],
) {
  if (targetClass === "compact-standard") {
    return {
      targetClass,
      compact: true,
      width: 800,
      height: 480,
    };
  }

  return {
    targetClass,
    compact: false,
    width: 1280,
    height: 720,
  };
}

export function createDashboardViewModel(
  state: DisplayProtocolState,
): DashboardViewModel {
  return {
    layout: createLayout(state.screen.targetClass),
    header: {
      left: state.header.left,
      center: state.header.center,
      right: state.header.right,
      transport: state.header.transport,
      mode: state.header.mode,
    },
    bands: state.bands.map((band) => ({
      key: band.key,
      title: band.title,
      cells: padBandCells(
        band.cells.map((cell) => {
          const showEncoder = shouldShowEncoder(cell);

          return {
            key: cell.key,
            label: cell.label,
            value: formatCellValue(cell),
            visualNormalized: cell.value.visualNormalized,
            showEncoder,
            encoderArcPath: showEncoder
              ? createEncoderArcPath(cell.value.visualNormalized, cell.empty)
              : "",
            inactive: cell.inactive,
            empty: cell.empty,
            accent: isAccentBand(band.key) && !cell.empty,
          };
        }),
        band.key,
      ),
    })),
  };
}
