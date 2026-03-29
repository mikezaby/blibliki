export type PatchViewMode = "editor" | "runtime";

type PatchViewModeSearch = {
  mode?: unknown;
};

export function normalizePatchViewMode(
  search: PatchViewModeSearch,
): PatchViewMode {
  return search.mode === "runtime" ? "runtime" : "editor";
}
