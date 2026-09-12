import { useSyncExternalStore } from "react";

type Values = Record<string, number>;

let values: Values = {};
const listeners = new Set<() => void>();

// The worker's control outputs by name, a few times a second; read by
// the readout on a control cable.
export const videoValues = {
  get: (): Values => values,
  set: (next: Values) => {
    values = next;
    listeners.forEach((listener) => {
      listener();
    });
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

// The value on a control output: a single module's, or instance 0 of an
// instanced one.
export function outputValue(
  all: Values,
  moduleId: string,
  ioName: string,
): number | undefined {
  return all[`${moduleId}:${ioName}`] ?? all[`${moduleId}:${ioName}:0`];
}

export function useOutputValue(moduleId: string, ioName: string) {
  const all = useSyncExternalStore(videoValues.subscribe, videoValues.get);

  return outputValue(all, moduleId, ioName);
}
