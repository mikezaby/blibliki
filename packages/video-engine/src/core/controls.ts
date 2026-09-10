import type { ControlValues } from "./Module";
import type { IRoute } from "./Routes";
import type { PropSchema } from "./schema";

export type { ControlValues } from "./Module";

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  exp = 1,
): number {
  if (inMax === inMin) return outMin;
  const normalized = Math.min(
    1,
    Math.max(0, (value - inMin) / (inMax - inMin)),
  );
  const t = exp === 1 ? normalized : Math.pow(normalized, 1 / exp);

  return outMin + t * (outMax - outMin);
}

export function controlName(moduleId: string, output: string): string {
  return `${moduleId}:${output}`;
}

export function instanceControlName(
  moduleId: string,
  output: string,
  instance: number,
): string {
  return `${moduleId}:${output}:${instance}`;
}

const NO_INSTANCES: ReadonlyMap<string, number> = new Map();

// Several routes into one prop add: the first route's outMin plus every
// route's swing, clamped to the prop's schema range when one is given, so a
// single route is a plain range mapping. `instance` reads the matching
// instance of an instanced source (by `instanceCounts`), wrapping around a
// narrower one; a single source feeds every instance, and a single consumer
// reads instance 0.
export function applyControlRoutes<P extends Record<string, unknown>>(
  props: P,
  routes: readonly IRoute[],
  values: ControlValues,
  schema: Record<string, PropSchema> = {},
  instance = 0,
  instanceCounts: ReadonlyMap<string, number> = NO_INSTANCES,
): P {
  const sums = new Map<string, number>();

  for (const route of routes) {
    const { moduleId, ioName } = route.source;
    const width = instanceCounts.get(moduleId) ?? 1;
    const value = values.get(
      width > 1
        ? instanceControlName(moduleId, ioName, instance % width)
        : controlName(moduleId, ioName),
    );
    if (value === undefined) continue;
    const outMin = route.outMin ?? 0;
    const mapped = mapRange(
      value,
      route.inMin ?? 0,
      route.inMax ?? 1,
      outMin,
      route.outMax ?? 1,
      route.exp,
    );
    const prop = route.destination.ioName;
    const current = sums.get(prop);
    sums.set(prop, current === undefined ? mapped : current + mapped - outMin);
  }

  if (sums.size === 0) return props;

  for (const [prop, value] of sums) {
    const range = schema[prop];
    if (range?.kind === "number") {
      sums.set(prop, Math.min(range.max, Math.max(range.min, value)));
    }
  }

  return { ...props, ...Object.fromEntries(sums) };
}
