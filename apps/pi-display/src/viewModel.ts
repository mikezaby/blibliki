import type {
  DisplayBandKey,
  DisplayProtocolState,
} from "@blibliki/display-protocol";

export type DashboardCellViewModel = {
  key: string;
  label: string;
  value: string;
  visual: string;
  visualNormalized: number | null;
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
  header: {
    left: string;
    center: string;
    right: string;
    transport: string;
    mode: string;
  };
  bands: DashboardBandViewModel[];
};

function createEncoderVisual(normalized: number | null, empty: boolean) {
  if (empty || normalized === null) {
    return "....";
  }

  const position = Math.max(0, Math.min(3, Math.round(normalized * 3)));
  return Array.from({ length: 4 }, (_, index) =>
    index === position ? "o" : ".",
  ).join("");
}

function isAccentBand(key: DisplayBandKey) {
  return key === "upper";
}

export function createDashboardViewModel(
  state: DisplayProtocolState,
): DashboardViewModel {
  return {
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
      cells: band.cells.map((cell) => ({
        key: cell.key,
        label: cell.label,
        value: cell.value.formatted,
        visual: createEncoderVisual(cell.value.visualNormalized, cell.empty),
        visualNormalized: cell.value.visualNormalized,
        inactive: cell.inactive,
        empty: cell.empty,
        accent: isAccentBand(band.key) && !cell.empty,
      })),
    })),
  };
}
