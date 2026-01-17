import { describe, it, expect, beforeEach } from "vitest";
import { ModuleType } from "@/modules";
import { MonoGain } from "@/modules/Gain";

describe("Module", () => {
  let gain: MonoGain;

  beforeEach(async (ctx) => {
    gain = new MonoGain(ctx.engine.id, {
      name: "gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1 },
    });
    // Wait for queueMicrotask in constructor to complete
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  describe("props setter", () => {
    describe("when setting a different value", () => {
      it("should update the prop", () => {
        gain.props = { gain: 0.5 };
        expect(gain.props.gain).toBe(0.5);
      });

      it("should create a new props object", () => {
        const propsBefore = gain["_props"];
        gain.props = { gain: 0.5 };
        const propsAfter = gain["_props"];
        expect(propsBefore).not.toBe(propsAfter);
      });
    });

    describe("when setting the same value", () => {
      it("should not update internal _props object", () => {
        const propsBefore = gain["_props"];
        gain.props = { gain: 1 };
        const propsAfter = gain["_props"];
        expect(propsBefore).toBe(propsAfter); // Same object reference
      });

      it("should keep the same prop value", () => {
        expect(gain.props.gain).toBe(1);
        gain.props = { gain: 1 };
        expect(gain.props.gain).toBe(1);
      });
    });

    describe("when setting multiple props", () => {
      it("should only update changed values", () => {
        const propsBefore = gain["_props"];

        // Setting same value again should not create new object
        gain.props = { gain: 1 };
        expect(gain["_props"]).toBe(propsBefore);

        // Setting different value should create new object
        gain.props = { gain: 2 };
        expect(gain["_props"]).not.toBe(propsBefore);
        expect(gain.props.gain).toBe(2);
      });
    });

    describe("when setting undefined value", () => {
      it("should not update the prop", () => {
        gain.props = { gain: 0.5 };
        gain.props = { gain: undefined };
        expect(gain.props.gain).toBe(0.5);
      });
    });

    describe("when no values change", () => {
      it("should return early without creating new props object", () => {
        gain.props = { gain: 1 };
        const propsBefore = gain["_props"];
        gain.props = { gain: 1 };
        const propsAfter = gain["_props"];

        // Should be same object reference (not spread)
        expect(propsBefore).toBe(propsAfter);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle rapid successive prop changes", () => {
      gain.props = { gain: 0.1 };
      gain.props = { gain: 0.2 };
      gain.props = { gain: 0.3 };
      expect(gain.props.gain).toBe(0.3);
    });

    it("should handle prop changes with same value multiple times", () => {
      const propsAfterFirstSet = ((gain.props = { gain: 0.5 }), gain["_props"]);
      gain.props = { gain: 0.5 };
      gain.props = { gain: 0.5 };

      // Should still be the same object (no new object created)
      expect(gain["_props"]).toBe(propsAfterFirstSet);
    });

    it("should handle alternating between two values", () => {
      const propsInitial = gain["_props"];

      gain.props = { gain: 0.5 };
      const propsAfter1 = gain["_props"];
      expect(propsAfter1).not.toBe(propsInitial);

      gain.props = { gain: 1 };
      const propsAfter2 = gain["_props"];
      expect(propsAfter2).not.toBe(propsAfter1);

      gain.props = { gain: 0.5 };
      const propsAfter3 = gain["_props"];
      expect(propsAfter3).not.toBe(propsAfter2);

      gain.props = { gain: 1 };
      const propsAfter4 = gain["_props"];
      expect(propsAfter4).not.toBe(propsAfter3);
    });
  });
});
