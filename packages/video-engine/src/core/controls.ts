export type IBinding = {
  id: string;
  moduleId: string;
  prop: string;
  control: string;
  inMin: number;
  inMax: number;
  outMin: number;
  outMax: number;
};

export type ControlValues = ReadonlyMap<string, number>;

export function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  if (inMax === inMin) return outMin;
  const t = Math.min(1, Math.max(0, (value - inMin) / (inMax - inMin)));

  return outMin + t * (outMax - outMin);
}

export function applyBindings<P extends Record<string, unknown>>(
  props: P,
  bindings: readonly IBinding[],
  controls: ControlValues,
): P {
  let result = props;

  for (const binding of bindings) {
    const value = controls.get(binding.control);
    if (value === undefined) continue;
    result = {
      ...result,
      [binding.prop]: mapRange(
        value,
        binding.inMin,
        binding.inMax,
        binding.outMin,
        binding.outMax,
      ),
    };
  }

  return result;
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
