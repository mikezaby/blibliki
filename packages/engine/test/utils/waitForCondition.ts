export const getPeak = (values: Float32Array): number =>
  values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);

export const waitForMicrotasks = async (count = 1): Promise<void> => {
  for (let index = 0; index < count; index += 1) {
    await new Promise<void>((resolve) => queueMicrotask(resolve));
  }
};

export const waitForCondition = async (
  condition: () => boolean,
  {
    timeoutMs = 2000,
    intervalMs = 10,
    description = "condition",
  }: {
    timeoutMs?: number;
    intervalMs?: number;
    description?: string;
  } = {},
) => {
  const startedAt = Date.now();

  // ponytail: setImmediate fires once per event-loop tick (~1-10ms even under CI load),
  // vs setTimeout(fn, N) which can fire 50-200ms late when the system is busy.
  // Without this, the 60ms closedHat signal window is entirely missed between polls.
  const si = (
    globalThis as unknown as { setImmediate?: (fn: () => void) => void }
  ).setImmediate;
  const yieldFn: (resolve: () => void) => void = si
    ? (resolve) => {
        si(resolve);
      }
    : (resolve) => {
        setTimeout(resolve, intervalMs);
      };

  while (!condition()) {
    if (Date.now() - startedAt >= timeoutMs) {
      throw new Error(
        `Timed out waiting for ${description} after ${timeoutMs}ms`,
      );
    }
    await new Promise<void>(yieldFn);
  }
};

export const waitForValue = async <T>(
  read: () => T,
  predicate: (value: T) => boolean,
  options?: {
    timeoutMs?: number;
    intervalMs?: number;
    description?: string;
  },
): Promise<T> => {
  let value = read();

  await waitForCondition(() => {
    value = read();
    return predicate(value);
  }, options);

  return value;
};

export const waitForAudioTime = async (
  clock: { currentTime: number },
  targetTime: number,
  options?: {
    timeoutMs?: number;
    intervalMs?: number;
    description?: string;
  },
): Promise<void> => {
  await waitForCondition(() => clock.currentTime >= targetTime, {
    timeoutMs: options?.timeoutMs,
    intervalMs: options?.intervalMs,
    description: options?.description ?? `audio time ${targetTime.toFixed(3)}s`,
  });
};
