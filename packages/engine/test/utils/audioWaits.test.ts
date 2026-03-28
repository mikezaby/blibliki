import { describe, expect, it } from "vitest";
import type Inspector from "@/modules/Inspector";
import {
  readInspectorPeak,
  waitForInspectorFinite,
  waitForInspectorNear,
  waitForInspectorPeakAbove,
  waitForInspectorValue,
} from "./audioWaits";

type FakeInspector = Pick<Inspector, "getValue" | "getValues">;

describe("audioWaits", () => {
  it("reads the maximum absolute peak from inspector samples", () => {
    const inspector: FakeInspector = {
      getValue: () => 0,
      getValues: () => new Float32Array([0, -0.25, 0.4, -0.7, 0.1]),
    };

    expect(readInspectorPeak(inspector)).toBeCloseTo(0.7, 5);
  });

  it("waits for an inspector value predicate to become true", async () => {
    let value = 0;
    const inspector: FakeInspector = {
      getValue: () => value,
      getValues: () => new Float32Array([value]),
    };

    setTimeout(() => {
      value = 0.6;
    }, 10);

    await expect(
      waitForInspectorValue(inspector, (currentValue) => currentValue > 0.5, {
        timeoutMs: 200,
        intervalMs: 1,
        description: "value above 0.5",
      }),
    ).resolves.toBeCloseTo(0.6, 5);
  });

  it("waits for inspector output to approach a target value", async () => {
    let value = 0;
    const inspector: FakeInspector = {
      getValue: () => value,
      getValues: () => new Float32Array([value]),
    };

    setTimeout(() => {
      value = 0.46;
    }, 10);

    await expect(
      waitForInspectorNear(inspector, 0.5, 0.05, {
        timeoutMs: 200,
        intervalMs: 1,
      }),
    ).resolves.toBeCloseTo(0.46, 5);
  });

  it("waits for inspector output to become finite", async () => {
    let value = Number.NaN;
    const inspector: FakeInspector = {
      getValue: () => value,
      getValues: () => new Float32Array([value]),
    };

    setTimeout(() => {
      value = 0;
    }, 10);

    await expect(
      waitForInspectorFinite(inspector, {
        timeoutMs: 200,
        intervalMs: 1,
      }),
    ).resolves.toBe(0);
  });

  it("waits for inspector peak to exceed a threshold", async () => {
    let values = new Float32Array([0, 0, 0]);
    const inspector: FakeInspector = {
      getValue: () => values[0] ?? 0,
      getValues: () => values,
    };

    setTimeout(() => {
      values = new Float32Array([0, -0.02, 0.04]);
    }, 10);

    await expect(
      waitForInspectorPeakAbove(inspector, 0.03, {
        timeoutMs: 200,
        intervalMs: 1,
      }),
    ).resolves.toBeCloseTo(0.04, 5);
  });
});
