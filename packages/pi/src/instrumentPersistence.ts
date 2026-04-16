import type { InstrumentDocument } from "@blibliki/instrument";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getConfigPath } from "./config.js";

export {
  createSavedInstrumentDocument,
  type CompiledInstrumentEnginePatch,
} from "@blibliki/instrument";

function getInstrumentWorkingCopyDir() {
  return join(dirname(getConfigPath()), "instruments");
}

export function getInstrumentWorkingCopyPath(instrumentId: string) {
  return join(getInstrumentWorkingCopyDir(), `${instrumentId}.json`);
}

export function loadInstrumentWorkingCopy(
  instrumentId: string,
): InstrumentDocument | null {
  const workingCopyPath = getInstrumentWorkingCopyPath(instrumentId);
  if (!existsSync(workingCopyPath)) {
    return null;
  }

  return JSON.parse(
    readFileSync(workingCopyPath, "utf-8"),
  ) as InstrumentDocument;
}

export function saveInstrumentWorkingCopy(
  instrumentId: string,
  document: InstrumentDocument,
) {
  const workingCopyDir = getInstrumentWorkingCopyDir();
  if (!existsSync(workingCopyDir)) {
    mkdirSync(workingCopyDir, { recursive: true });
  }

  writeFileSync(
    getInstrumentWorkingCopyPath(instrumentId),
    JSON.stringify(document, null, 2),
    "utf-8",
  );
}
