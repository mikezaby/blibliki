import readline from "node:readline";
import type { PiDisplayState } from "./runtime/PiDisplayState.js";

const rl = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

rl.on("line", (line) => {
  try {
    const snapshot = JSON.parse(line) as PiDisplayState;
    render(snapshot);
  } catch (error) {
    console.error("Invalid display snapshot", error);
  }
});

function render(snapshot: PiDisplayState) {
  process.stdout.write("\x1bc");
  process.stdout.write(
    `${snapshot.header.patchName} | ${snapshot.header.trackName} | ${snapshot.header.pageName} | ${snapshot.header.transport}\n`,
  );
  process.stdout.write(`${renderBand("GLOBAL", snapshot.globals)}\n`);
  process.stdout.write(`${renderBand(snapshot.upper.title, snapshot.upper.cells)}\n`);
  process.stdout.write(`${renderBand(snapshot.lower.title, snapshot.lower.cells)}\n`);
  if (snapshot.seqEdit) {
    process.stdout.write(
      `SEQ EDIT page=${snapshot.seqEdit.page} step=${snapshot.seqEdit.selected} playhead=${snapshot.seqEdit.step}\n`,
    );
  }
}

function renderBand(title: string, cells: PiDisplayState["globals"]) {
  const labels = cells.map((cell) => cell.label.padEnd(7, " ")).join(" | ");
  const values = cells.map((cell) => cell.value.padEnd(7, " ")).join(" | ");
  return `${title}\n${labels}\n${values}`;
}
