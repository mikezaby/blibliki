import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as slint from "slint-ui";
import { readDisplayAppConfig } from "@/config";
import { createDisplayStore } from "@/displayStore";
import { createDisplayLogger } from "@/logger";
import { createOscListener } from "@/oscListener";
import {
  createDashboardViewModel,
  type DashboardBandViewModel,
} from "@/viewModel";

type DashboardCellModel = {
  label: string;
  value: string;
  visual: string;
  accent: boolean;
  inactive: boolean;
  empty: boolean;
};

type DashboardBandModel = {
  title: string;
  cells: DashboardCellModel[];
};

function createBandModel(band: DashboardBandViewModel): DashboardBandModel {
  return {
    title: band.title,
    cells: band.cells.map((cell) => ({
      label: cell.label,
      value: cell.value,
      visual: cell.visual,
      accent: cell.accent,
      inactive: cell.inactive,
      empty: cell.empty,
    })),
  };
}

type DashboardWindowHandle = slint.ComponentHandle & {
  header_left: string;
  header_center: string;
  header_right: string;
  transport_text: string;
  mode_text: string;
  transport_active: boolean;
  global_title: string;
  upper_title: string;
  lower_title: string;
  global_cells: DashboardCellModel[];
  upper_cells: DashboardCellModel[];
  lower_cells: DashboardCellModel[];
};

type DashboardModule = {
  DashboardWindow: new () => DashboardWindowHandle;
};

function resolveUiPath() {
  const currentFile = fileURLToPath(import.meta.url);
  return resolve(dirname(currentFile), "../ui/dashboard.slint");
}

function applyState(
  window: DashboardWindowHandle,
  store: ReturnType<typeof createDisplayStore>,
) {
  const state = store.getState();
  if (!state) {
    return;
  }

  const viewModel = createDashboardViewModel(state);
  const globalBand = viewModel.bands.find((band) => band.key === "global");
  const upperBand = viewModel.bands.find((band) => band.key === "upper");
  const lowerBand = viewModel.bands.find((band) => band.key === "lower");

  window.header_left = viewModel.header.left;
  window.header_center = viewModel.header.center;
  window.header_right = viewModel.header.right;
  window.transport_text = viewModel.header.transport;
  window.mode_text = viewModel.header.mode;
  window.transport_active = viewModel.header.transport === "PLAY";
  window.global_title = globalBand?.title ?? "GLOBAL";
  window.upper_title = upperBand?.title ?? "UPPER";
  window.lower_title = lowerBand?.title ?? "LOWER";
  window.global_cells = globalBand ? createBandModel(globalBand).cells : [];
  window.upper_cells = upperBand ? createBandModel(upperBand).cells : [];
  window.lower_cells = lowerBand ? createBandModel(lowerBand).cells : [];
  window.window.requestRedraw();
}

async function main() {
  const config = readDisplayAppConfig();
  const logger = createDisplayLogger(config.debug);
  const store = createDisplayStore();
  const ui = slint.loadFile(resolveUiPath()) as DashboardModule;
  const window = new ui.DashboardWindow();
  const listener = createOscListener(config, store, logger);

  listener.start(() => {
    applyState(window, store);
  });

  applyState(window, store);

  const shutdown = () => {
    listener.close();
    window.hide();
    slint.quitEventLoop();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await window.run();
}

void main();
