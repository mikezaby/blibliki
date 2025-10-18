import { Engine } from "@/Engine";

export { default as Transport, TransportState } from "./Transport";
export { default as Time, t, nt } from "./Time";

export type { TransportEvents } from "./Transport";
export type { TTime } from "./Time";

export function now() {
  return Engine.current.context.currentTime;
}

export function browserToContextTime(time: number): number {
  const differenceBetweenClocks = performance.now() / 1000 - now();
  return time / 1000 - differenceBetweenClocks;
}
