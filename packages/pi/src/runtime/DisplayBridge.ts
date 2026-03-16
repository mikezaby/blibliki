import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { PiDisplayState } from "./PiDisplayState.js";

export class DisplayBridge {
  private child: ChildProcessWithoutNullStreams | null = null;

  start() {
    if (this.child) return;

    const externalBinary = process.env.BLIBLIKI_PI_DISPLAY_BIN;
    if (externalBinary) {
      this.child = spawn(externalBinary, [], {
        stdio: ["pipe", "inherit", "inherit"],
      });
      return;
    }

    const childScript = new URL("../displayChild.js", import.meta.url);
    this.child = spawn(process.execPath, [childScript], {
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
