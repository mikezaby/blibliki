import type { ModuleProps } from "./modulesSlice";

export const areModulesEqualForMidiMapper = (
  previous: ModuleProps[],
  next: ModuleProps[],
): boolean => {
  if (previous === next) return true;
  if (previous.length !== next.length) return false;

  for (let i = 0; i < previous.length; i += 1) {
    const prev = previous[i];
    const curr = next[i];
    if (!prev || !curr) return false;

    if (
      prev.id !== curr.id ||
      prev.name !== curr.name ||
      prev.moduleType !== curr.moduleType
    ) {
      return false;
    }
  }

  return true;
};
