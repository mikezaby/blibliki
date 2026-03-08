import { sleep } from "@blibliki/utils";

export const getPeak = (values: Float32Array): number =>
  values.reduce((max, value) => Math.max(max, Math.abs(value)), 0);

export const waitForCondition = async (
  condition: () => boolean,
  {
    timeoutMs = 2000,
    intervalMs = 10,
  }: {
    timeoutMs?: number;
    intervalMs?: number;
  } = {},
) => {
  const startedAt = Date.now();

  while (!condition()) {
    if (Date.now() - startedAt >= timeoutMs) break;
    await sleep(intervalMs);
  }
};
