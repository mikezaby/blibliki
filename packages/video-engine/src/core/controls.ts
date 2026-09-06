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

// Several routes into one prop add: the first route's outMin plus every
// route's swing, clamped to the prop's schema range when one is given, so a
// single route is a plain range mapping.
export function applyControlRoutes<P extends Record<string, unknown>>(
  props: P,
  routes: readonly IRoute[],
  values: ControlValues,
  schema: Record<string, PropSchema> = {},
): P {
  const sums = new Map<string, number>();

  for (const route of routes) {
    const value = values.get(
      controlName(route.source.moduleId, route.source.ioName),
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

// ponytail: three fixed bands by bin index; a configurable band table when a
// patch needs a specific frequency range.
export function spectrumToControls(
  bins: Float32Array,
  prefix = "spectrum",
  minDb = -100,
  maxDb = -30,
): Record<string, number> {
  const normalized = Array.from(bins, (db) =>
    Math.min(1, Math.max(0, (db - minDb) / (maxDb - minDb))),
  );
  const third = Math.max(1, Math.floor(normalized.length / 3));
  const mean = (values: number[]) =>
    values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length;

  return {
    [`${prefix}:low`]: mean(normalized.slice(0, third)),
    [`${prefix}:mid`]: mean(normalized.slice(third, third * 2)),
    [`${prefix}:high`]: mean(normalized.slice(third * 2)),
    [`${prefix}:level`]: mean(normalized),
  };
}
