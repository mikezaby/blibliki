type ValidationOptions = {
  documentPath: string;
};

const MODULE_PATH_PATTERN = /^config\.modules\[(\d+)\](?:\.|$)/;
const EDGE_PATH_PATTERN = /^config\.gridNodes\.edges\[(\d+)\](?:\.|$)/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function formatScalarForLog(value: unknown): string | null {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  return null;
}

function collectUndefinedPaths(
  value: unknown,
  currentPath: string,
  paths: string[],
): void {
  if (value === undefined) {
    paths.push(currentPath || "<root>");
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      const nextPath = currentPath ? `${currentPath}[${index}]` : `[${index}]`;
      collectUndefinedPaths(entry, nextPath, paths);
    });
    return;
  }

  if (!isRecord(value)) return;

  Object.entries(value).forEach(([key, entry]) => {
    const nextPath = currentPath ? `${currentPath}.${key}` : key;
    collectUndefinedPaths(entry, nextPath, paths);
  });
}

function formatModuleContext(payload: unknown, moduleIndex: number): string {
  if (!isRecord(payload)) return "";
  const config = payload.config;
  if (!isRecord(config) || !Array.isArray(config.modules)) return "";

  const modules = config.modules as unknown[];
  const moduleEntry = modules[moduleIndex];
  if (!isRecord(moduleEntry)) return "";

  const context: string[] = [];
  const moduleId = moduleEntry.id;
  const moduleType = moduleEntry.moduleType;
  const moduleName = moduleEntry.name;

  if (typeof moduleId === "string") {
    context.push(`moduleId=${moduleId}`);
  }

  const moduleTypeLabel = formatScalarForLog(moduleType);
  if (moduleTypeLabel !== null) {
    context.push(`moduleType=${moduleTypeLabel}`);
  }

  if (typeof moduleName === "string") {
    context.push(`name=${moduleName}`);
  }

  return context.join(", ");
}

function formatEdgeContext(payload: unknown, edgeIndex: number): string {
  if (!isRecord(payload)) return "";
  const config = payload.config;
  if (!isRecord(config)) return "";

  const gridNodes = config.gridNodes;
  if (!isRecord(gridNodes) || !Array.isArray(gridNodes.edges)) return "";

  const edges = gridNodes.edges as unknown[];
  const edgeEntry = edges[edgeIndex];
  if (!isRecord(edgeEntry)) return "";

  const context: string[] = [];
  const edgeId = edgeEntry.id;
  const source = edgeEntry.source;
  const target = edgeEntry.target;

  if (typeof edgeId === "string") {
    context.push(`edgeId=${edgeId}`);
  }

  if (typeof source === "string") {
    context.push(`source=${source}`);
  }

  if (typeof target === "string") {
    context.push(`target=${target}`);
  }

  return context.join(", ");
}

function formatPathWithContext(path: string, payload: unknown): string {
  const moduleMatch = path.match(MODULE_PATH_PATTERN);
  if (moduleMatch) {
    const moduleIndex = Number(moduleMatch[1]);
    const context = formatModuleContext(payload, moduleIndex);
    return context ? `${path} (${context})` : path;
  }

  const edgeMatch = path.match(EDGE_PATH_PATTERN);
  if (edgeMatch) {
    const edgeIndex = Number(edgeMatch[1]);
    const context = formatEdgeContext(payload, edgeIndex);
    return context ? `${path} (${context})` : path;
  }

  return path;
}

export function assertPatchPayloadHasNoUndefined(
  payload: unknown,
  options: ValidationOptions,
): void {
  const undefinedPaths: string[] = [];
  collectUndefinedPaths(payload, "", undefinedPaths);

  if (undefinedPaths.length === 0) {
    return;
  }

  const formattedPaths = undefinedPaths.map((path) =>
    formatPathWithContext(path, payload),
  );

  const lines = formattedPaths.map((path) => `- ${path}`);
  const message = [
    "Patch save aborted: Firestore does not support undefined values.",
    `Document: ${options.documentPath}`,
    `Undefined fields found (${formattedPaths.length}):`,
    ...lines,
  ].join("\n");

  console.error("[PatchPayloadValidation]", {
    documentPath: options.documentPath,
    undefinedFields: formattedPaths,
  });

  throw new Error(message);
}
