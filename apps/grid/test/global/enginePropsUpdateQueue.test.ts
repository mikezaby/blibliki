// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createEnginePropsUpdateQueue } from "../../src/global/enginePropsUpdateQueue";

describe("enginePropsUpdateQueue", () => {
  it("deduplicates identical updates for the same module", () => {
    const queue = createEnginePropsUpdateQueue();
    const props = { gain: 0.4 };
    const state = { currentStep: 0 };

    expect(
      queue.enqueue({
        id: "mod-a",
        name: "A",
        props,
        state,
      }),
    ).toBe(true);

    expect(
      queue.enqueue({
        id: "mod-a",
        name: "A",
        props,
        state,
      }),
    ).toBe(false);

    expect(queue.flush()).toEqual([
      {
        id: "mod-a",
        changes: {
          name: "A",
          props,
          state,
        },
      },
    ]);
    expect(queue.flush()).toEqual([]);
  });

  it("keeps the latest update for a module within a batch", () => {
    const queue = createEnginePropsUpdateQueue();
    const propsA = { gain: 0.4 };
    const propsB = { gain: 0.7 };

    queue.enqueue({
      id: "mod-a",
      name: "A",
      props: propsA,
      state: { currentStep: 0 },
    });
    queue.enqueue({
      id: "mod-a",
      name: "A",
      props: propsB,
      state: { currentStep: 1 },
    });

    expect(queue.flush()).toEqual([
      {
        id: "mod-a",
        changes: {
          name: "A",
          props: propsB,
          state: { currentStep: 1 },
        },
      },
    ]);
  });

  it("enqueues when runtime state reference changes", () => {
    const queue = createEnginePropsUpdateQueue();
    const props = { position: 0 };
    const firstState = { actualPosition: 0.1 };
    const nextState = { actualPosition: 0.2 };

    queue.enqueue({
      id: "mod-a",
      name: "A",
      props,
      state: firstState,
    });
    queue.flush();

    expect(
      queue.enqueue({
        id: "mod-a",
        name: "A",
        props,
        state: nextState,
      }),
    ).toBe(true);

    expect(queue.flush()).toEqual([
      {
        id: "mod-a",
        changes: {
          state: nextState,
        },
      },
    ]);
  });

  it("tracks modules independently", () => {
    const queue = createEnginePropsUpdateQueue();

    queue.enqueue({
      id: "mod-a",
      name: "A",
      props: { gain: 0.1 },
      state: { currentStep: 1 },
    });
    queue.enqueue({
      id: "mod-b",
      name: "B",
      props: { gain: 0.2 },
      state: { currentStep: 2 },
      voices: 4,
    });

    expect(queue.flush()).toEqual([
      {
        id: "mod-a",
        changes: {
          name: "A",
          props: { gain: 0.1 },
          state: { currentStep: 1 },
        },
      },
      {
        id: "mod-b",
        changes: {
          name: "B",
          props: { gain: 0.2 },
          state: { currentStep: 2 },
          voices: 4,
        },
      },
    ]);
  });

  it("drops snapshots for removed modules when swept", () => {
    const queue = createEnginePropsUpdateQueue();
    const props = { gain: 0.3 };

    queue.enqueue({
      id: "mod-z",
      name: "Z",
      props,
      state: { currentStep: 1 },
    });
    queue.flush();

    // Remove stale module snapshots
    queue.sweep([]);

    // Same references should enqueue again because baseline was removed
    expect(
      queue.enqueue({
        id: "mod-z",
        name: "Z",
        props,
        state: { currentStep: 1 },
      }),
    ).toBe(true);
  });
});
