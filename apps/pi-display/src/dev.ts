import { spawn, type ChildProcess } from "node:child_process";
import { watch, type FSWatcher } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const currentDir = dirname(currentFile);
const mainEntryPath = resolve(currentDir, "main.ts");
const watchPaths = [currentDir, resolve(currentDir, "../ui")];
const appRoot = resolve(currentDir, "..");
const RESTART_DEBOUNCE_MS = 120;

let childProcess: ChildProcess | undefined;
let restartTimer: ReturnType<typeof setTimeout> | undefined;
let restartRequested = false;
let shuttingDown = false;

function startChildProcess() {
  childProcess = spawn(process.execPath, ["--import", "tsx", mainEntryPath], {
    cwd: appRoot,
    env: process.env,
    stdio: "inherit",
  });

  childProcess.once("exit", () => {
    childProcess = undefined;

    if (shuttingDown) {
      process.exit(0);
    }

    if (!restartRequested) {
      return;
    }

    restartRequested = false;
    startChildProcess();
  });
}

function requestRestart() {
  if (shuttingDown) {
    return;
  }

  if (restartTimer) {
    clearTimeout(restartTimer);
  }

  restartTimer = setTimeout(() => {
    restartTimer = undefined;

    if (!childProcess) {
      startChildProcess();
      return;
    }

    restartRequested = true;
    childProcess.kill("SIGTERM");
  }, RESTART_DEBOUNCE_MS);
}

function createWatchers() {
  return watchPaths.map((watchPath) =>
    watch(watchPath, () => {
      requestRestart();
    }),
  );
}

function shutdown(watchers: FSWatcher[]) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  if (restartTimer) {
    clearTimeout(restartTimer);
    restartTimer = undefined;
  }

  for (const watcher of watchers) {
    watcher.close();
  }

  if (!childProcess) {
    process.exit(0);
    return;
  }

  childProcess.kill("SIGTERM");
}

const watchers = createWatchers();

process.on("SIGINT", () => {
  shutdown(watchers);
});

process.on("SIGTERM", () => {
  shutdown(watchers);
});

startChildProcess();
