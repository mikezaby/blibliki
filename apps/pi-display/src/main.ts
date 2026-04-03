import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readDisplayAppConfig } from "@/config";
import { createDisplayStore } from "@/displayStore";
import { createDisplayLogger } from "@/logger";
import { createOscListener } from "@/oscListener";
import { loadSlintRuntime } from "@/slintRuntime";
import {
  createDashboardViewModel,
  type DashboardBandViewModel,
} from "@/viewModel";
import { runWindowWithFallback, shouldUseShowOnlyMode } from "@/windowRunner";

type DashboardCellModel = {
  label: string;
  value: string;
  arc_path: string;
  needle_path: string;
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
      arc_path: cell.encoderArcPath,
      needle_path: cell.encoderNeedlePath,
      accent: cell.accent,
      inactive: cell.inactive,
      empty: cell.empty,
    })),
  };
}

type DashboardWindowHandle = import("slint-ui").ComponentHandle & {
  compact_layout: boolean;
  splash_visible: boolean;
  splash_logo_text: string;
  header_left: string;
  header_center: string;
  header_right: string;
  transport_text: string;
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

const MIN_STARTUP_SPLASH_MS = 1000;
const SPLASH_LOGO_TEXT = "Blibliki";
const SPLASH_LETTER_INTERVAL_MS = 100;

function resolveUiPath() {
  const currentFile = fileURLToPath(import.meta.url);
  return resolve(dirname(currentFile), "../ui/dashboard.slint");
}

function applyState(
  window: DashboardWindowHandle,
  store: ReturnType<typeof createDisplayStore>,
): boolean {
  const state = store.getState();
  if (!state) {
    return false;
  }

  const viewModel = createDashboardViewModel(state);
  const globalBand = viewModel.bands.find((band) => band.key === "global");
  const upperBand = viewModel.bands.find((band) => band.key === "upper");
  const lowerBand = viewModel.bands.find((band) => band.key === "lower");

  window.compact_layout = viewModel.layout.compact;
  window.header_left = viewModel.header.left;
  window.header_center = viewModel.header.center;
  window.header_right = viewModel.header.right;
  window.transport_text = viewModel.header.transport;
  window.transport_active = viewModel.header.transport === "PLAY";
  window.global_title = globalBand?.title ?? "GLOBAL";
  window.upper_title = upperBand?.title ?? "UPPER";
  window.lower_title = lowerBand?.title ?? "LOWER";
  window.global_cells = globalBand ? createBandModel(globalBand).cells : [];
  window.upper_cells = upperBand ? createBandModel(upperBand).cells : [];
  window.lower_cells = lowerBand ? createBandModel(lowerBand).cells : [];
  window.window.requestRedraw();
  return true;
}

async function main() {
  const config = readDisplayAppConfig();
  const logger = createDisplayLogger(config.debug);
  const store = createDisplayStore();
  const slint = await loadSlintRuntime();
  const ui = slint.loadFile(resolveUiPath()) as DashboardModule;
  const window = new ui.DashboardWindow();
  const splashShownAt = Date.now();
  let splashHideTimeout: ReturnType<typeof setTimeout> | undefined;
  let splashLetterInterval: ReturnType<typeof setInterval> | undefined;
  let revealedLetters = 0;
  const listener = createOscListener(config, store, logger);
  let resolveShutdown: (() => void) | undefined;
  const shutdownPromise = new Promise<void>((resolve) => {
    resolveShutdown = resolve;
  });

  window.splash_visible = true;
  window.splash_logo_text = "";
  window.window.requestRedraw();

  const stopSplashAnimation = () => {
    if (!splashLetterInterval) {
      return;
    }

    clearInterval(splashLetterInterval);
    splashLetterInterval = undefined;
  };

  splashLetterInterval = setInterval(() => {
    if (revealedLetters >= SPLASH_LOGO_TEXT.length) {
      stopSplashAnimation();
      return;
    }

    revealedLetters += 1;
    window.splash_logo_text = SPLASH_LOGO_TEXT.slice(0, revealedLetters);
    window.window.requestRedraw();

    if (revealedLetters >= SPLASH_LOGO_TEXT.length) {
      stopSplashAnimation();
    }
  }, SPLASH_LETTER_INTERVAL_MS);

  const hideSplash = () => {
    if (!window.splash_visible) {
      return;
    }

    stopSplashAnimation();
    window.splash_visible = false;
    window.window.requestRedraw();
  };

  const hideSplashWhenReady = () => {
    const remainingSplashMs =
      MIN_STARTUP_SPLASH_MS - (Date.now() - splashShownAt);

    if (remainingSplashMs <= 0) {
      if (splashHideTimeout) {
        clearTimeout(splashHideTimeout);
        splashHideTimeout = undefined;
      }
      hideSplash();
      return;
    }

    if (splashHideTimeout) {
      return;
    }

    splashHideTimeout = setTimeout(() => {
      splashHideTimeout = undefined;
      hideSplash();
    }, remainingSplashMs);
  };

  listener.start(() => {
    if (applyState(window, store)) {
      hideSplashWhenReady();
    }
  });

  if (applyState(window, store)) {
    hideSplashWhenReady();
  }

  const shutdown = () => {
    stopSplashAnimation();
    if (splashHideTimeout) {
      clearTimeout(splashHideTimeout);
    }
    listener.close();
    window.hide();
    slint.quitEventLoop();
    resolveShutdown?.();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  await runWindowWithFallback(window, logger, {
    preferShowOnlyMode: shouldUseShowOnlyMode(process.env, process.platform),
    keepAlive: () => shutdownPromise,
  });
}

void main();
