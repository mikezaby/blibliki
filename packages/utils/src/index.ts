export { deterministicId } from "./deterministicId";
export type { AtLeast, Optional, AnyObject, EmptyObject } from "./types";
export { deepmerge } from "deepmerge-ts";
export { oscilloscope } from "./oscilloscope";

export function assertNever(value: never, message?: string): never {
  console.error("Unknown value", value);
  message ??= "Not possible value";
  throw Error(message);
}

type UnlessUndefined<T> = T extends undefined ? never : T;

export function assertDefined<T>(
  value: T | undefined,
): asserts value is UnlessUndefined<T> {
  if (value === undefined) {
    throw new Error("Value is undefined");
  }
}

export function uuidv4() {
  return crypto.randomUUID();
}

enum ScaleType {
  linear = "LINEAR",
  exponential = "EXPONENTIAL",
}

export const dbToGain = (db: number): number => Math.pow(10, db / 20);

export function scaleNormalized({
  value,
  min,
  max,
  type = ScaleType.linear,
}: {
  value: number;
  min: number;
  max: number;
  type?: ScaleType;
}): number {
  if (type === ScaleType.linear) {
    return min + (max - min) * value;
  }

  return min * Math.pow(max / min, value);
}

export function createScaleNormalized({
  min,
  max,
  type = ScaleType.linear,
}: {
  min: number;
  max: number;
  type?: ScaleType;
}): (value: number) => number {
  return (value: number) => scaleNormalized({ value, min, max, type });
}

export function sleep(time: number): Promise<unknown> {
  return new Promise((resolve) => setTimeout(resolve, time));
}

export function notImplemented(message?: string): never {
  message ??= "Not implemented";
  console.error(message);
  throw Error(message);
}

export const isNumber = (value: unknown): value is number =>
  typeof value === "number" && !isNaN(value);

export const pick = <T extends object, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      result[key] = obj[key];
    }
  }
  return result;
};

export const upperFirst = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

export function throttle<Args extends unknown[], R>(
  fn: (...args: Args) => R,
  wait: number,
): (...args: Args) => R | undefined {
  let lastCall = 0;

  return (...args: Args): R | undefined => {
    const now = Date.now();
    if (now - lastCall >= wait) {
      lastCall = now;
      return fn(...args);
    }
    return undefined;
  };
}

export function toPrimitive(
  value: unknown,
): string | number | boolean | undefined {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "undefined"
  ) {
    return value;
  }

  throw new Error(
    `Unsupported value for toPrimitive: ${JSON.stringify(value)}`,
  );
}

/**
 * Firefox-compatible alternative to AudioParam.cancelAndHoldAtTime()
 *
 * The cancelAndHoldAtTime method is not supported in Firefox versions prior to 72.
 * This utility provides cross-browser compatibility by falling back to
 * cancelScheduledValues + setValueAtTime when the native method is unavailable.
 *
 * @param param - The AudioParam to modify
 * @param time - The time at which to cancel and hold
 * @returns The current parameter value
 */
export function cancelAndHoldAtTime(param: AudioParam, time: number): number {
  // Try to use native cancelAndHoldAtTime if available (Chrome, Firefox 72+)
  if (typeof param.cancelAndHoldAtTime === "function") {
    param.cancelAndHoldAtTime(time);
    return param.value;
  }

  // Fallback for older Firefox and other browsers
  const currentValue = param.value;
  param.cancelScheduledValues(time);
  param.setValueAtTime(currentValue, time);

  return currentValue;
}
