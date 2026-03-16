import { spawn, type ChildProcessByStdio } from "node:child_process";
import { existsSync } from "node:fs";
import type { Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import type { PiDisplayState } from "./PiDisplayState.js";

type DisplayChildLaunch = {
  command: string;
  args: string[];
};

type ResolveDisplayChildLaunchOptions = {
  importMetaUrl: string;
  externalBinary?: string;
  execPath?: string;
  execArgv?: string[];
  fileExists?: (path: string) => boolean;
};

export function resolveDisplayChildLaunch({
  importMetaUrl,
  externalBinary,
  execPath = process.execPath,
  execArgv = process.execArgv,
  fileExists = existsSync,
}: ResolveDisplayChildLaunchOptions): DisplayChildLaunch {
  if (externalBinary) {
    return {
      command: externalBinary,
      args: [],
    };
  }

  const displayChildJsPath = fileURLToPath(
    new URL("../displayChild.js", importMetaUrl),
  );
  const displayChildPath = fileExists(displayChildJsPath)
    ? displayChildJsPath
    : fileURLToPath(new URL("../displayChild.ts", importMetaUrl));

  return {
    command: execPath,
    args: [...execArgv, displayChildPath],
  };
}

export class DisplayBridge {
  private child: ChildProcessByStdio<Writable, null, null> | null = null;

  start() {
    if (this.child) return;

    const launch = resolveDisplayChildLaunch({
      importMetaUrl: import.meta.url,
      externalBinary: process.env.BLIBLIKI_PI_DISPLAY_BIN,
    });
    this.child = spawn(launch.command, launch.args, {
      stdio: ["pipe", "inherit", "inherit"],
    });
  }

  push(snapshot: PiDisplayState) {
    this.child?.stdin.write(`${JSON.stringify(snapshot)}\n`);
  }

  dispose() {
    if (!this.child) return;
    this.child.stdin.end();
    this.child.kill();
    this.child = null;
  }
}
