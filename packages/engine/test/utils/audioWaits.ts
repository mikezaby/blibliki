import type Inspector from "@/modules/Inspector";
import { getPeak, waitForValue } from "./waitForCondition";

type AudioWaitOptions = {
  timeoutMs?: number;
  intervalMs?: number;
  description?: string;
};

type InspectorLike = Pick<Inspector, "getValue" | "getValues">;

const withAudioWaitDefaults = (
  options: AudioWaitOptions | undefined,
  description: string,
): AudioWaitOptions => ({
  timeoutMs: options?.timeoutMs ?? 3000,
  intervalMs: options?.intervalMs,
  description: options?.description ?? description,
});

export const readInspectorPeak = (inspector: InspectorLike): number =>
  getPeak(inspector.getValues());

export const waitForInspectorValue = (
  inspector: InspectorLike,
  predicate: (value: number) => boolean,
  options?: AudioWaitOptions,
): Promise<number> =>
  waitForValue(
    () => inspector.getValue(),
    predicate,
    withAudioWaitDefaults(options, "matching inspector output"),
  );

export const waitForInspectorNear = (
  inspector: InspectorLike,
  expected: number,
  tolerance = 0.1,
  options?: AudioWaitOptions,
): Promise<number> =>
  waitForInspectorValue(
    inspector,
    (value) => Math.abs(value - expected) <= tolerance,
    withAudioWaitDefaults(options, `inspector output near ${expected}`),
  );

export const waitForInspectorFinite = (
  inspector: InspectorLike,
  options?: AudioWaitOptions,
): Promise<number> =>
  waitForInspectorValue(
    inspector,
    Number.isFinite,
    withAudioWaitDefaults(options, "finite inspector output"),
  );

export const waitForInspectorPeakAbove = (
  inspector: InspectorLike,
  threshold: number,
  options?: AudioWaitOptions,
): Promise<number> =>
  waitForValue(
    () => readInspectorPeak(inspector),
    (peak) => peak > threshold,
    withAudioWaitDefaults(options, `inspector peak above ${threshold}`),
  );
