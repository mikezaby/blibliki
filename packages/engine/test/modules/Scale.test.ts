import { sleep } from "@blibliki/utils";
import { describe, it, expect, beforeEach } from "vitest";
import { Module } from "@/core";
import { createModule, ModuleType } from "@/modules";
import Constant from "@/modules/Constant";
import Inspector from "@/modules/Inspector";
import { MonoScale } from "@/modules/Scale";

describe("Scale", () => {
  let scale: MonoScale;
  let amount: Constant;
  let inspector: Inspector;

  beforeEach((ctx) => {
    scale = Module.create(MonoScale, ctx.engine.id, {
      name: "filterScale",
      moduleType: ModuleType.Scale,
      props: { min: 20, max: 20000, current: 440, mode: "exponential" },
    });

    amount = createModule(ctx.engine.id, {
      name: "amount",
      moduleType: ModuleType.Constant,
      props: { value: 1 },
    }) as Constant;
    amount.start(ctx.context.currentTime);

    inspector = createModule(ctx.engine.id, {
      name: "inspector",
      moduleType: ModuleType.Inspector,
      props: {},
    }) as Inspector;

    amount.plug({ audioModule: scale, from: "out", to: "in" });
    scale.audioNode.connect(inspector.audioNode);
  });

  describe("when amount is 1", () => {
    beforeEach(async () => {
      amount.props = { value: 1 };
      await sleep(50);
    });

    it("it returns max value", () => {
      expect(inspector.getValue()).to.be.closeTo(20000, 1);
    });
  });

  describe("when amount is -1", () => {
    beforeEach(async () => {
      amount.props = { value: -1 };
      await sleep(50);
    });

    it("it returns min value", () => {
      expect(inspector.getValue()).to.be.closeTo(20, 1);
    });
  });

  describe("when amount is 0", () => {
    beforeEach(async () => {
      amount.props = { value: 0 };
      await sleep(50);
    });

    it("it returns min value", () => {
      expect(inspector.getValue()).to.be.closeTo(440, 1);
    });
  });

  describe("when amount is 0.5", () => {
    beforeEach(async () => {
      amount.props = { value: 0.5 };
      await sleep(50);
    });

    it("it returns value between current and max", () => {
      expect(inspector.getValue()).to.be.closeTo(2966, 1);
    });
  });

  describe("when amount is -0.5", () => {
    beforeEach(async () => {
      amount.props = { value: -0.5 };
      await sleep(50);
    });

    it("it returns value between current and min", () => {
      expect(inspector.getValue()).to.be.closeTo(93, 1);
    });
  });

  describe("when current is updated", () => {
    beforeEach(async () => {
      amount.props = { value: 0 };
      scale.props = { current: 220 };
      await sleep(50);
    });

    it("it returns the new updated value", () => {
      expect(inspector.getValue()).to.be.closeTo(220, 1);
    });
  });

  describe("edge cases with zero values", () => {
    describe("when min is 0", () => {
      beforeEach(async () => {
        scale.props = { min: 0, max: 100, current: 50 };
        amount.props = { value: -1 };
        await sleep(50);
      });

      it("it should handle min=0 without errors", () => {
        const value = inspector.getValue();
        expect(value).to.be.a("number");
        expect(isNaN(value)).to.be.false;
      });
    });

    describe("when max is 0", () => {
      beforeEach(async () => {
        scale.props = { min: -100, max: 0, current: -50 };
        amount.props = { value: 1 };
        await sleep(50);
      });

      it("it should handle max=0 without errors", () => {
        const value = inspector.getValue();
        expect(value).to.be.a("number");
        expect(isNaN(value)).to.be.false;
      });
    });

    describe("when current is 0", () => {
      beforeEach(async () => {
        scale.props = { min: -10, max: 10, current: 0 };
        amount.props = { value: 0.5 };
        await sleep(50);
      });

      it("it should handle current=0 without errors", () => {
        const value = inspector.getValue();
        expect(value).to.be.a("number");
        expect(isNaN(value)).to.be.false;
      });
    });

    describe("when all values are 0", () => {
      beforeEach(async () => {
        scale.props = { min: 0, max: 0, current: 0 };
        amount.props = { value: 0 };
        await sleep(50);
      });

      it("it should handle all zeros without errors", () => {
        const value = inspector.getValue();
        expect(value).to.be.a("number");
        expect(isNaN(value)).to.be.false;
      });
    });
  });

  describe("edge cases with negative values", () => {
    describe("when min is negative", () => {
      beforeEach(async () => {
        scale.props = { min: -100, max: 100, current: 0 };
        amount.props = { value: -1 };
        await sleep(50);
      });

      it("it should return min value", () => {
        const value = inspector.getValue();
        expect(value).to.be.a("number");
        expect(isNaN(value)).to.be.false;
      });
    });

    describe("when max is negative", () => {
      beforeEach(async () => {
        scale.props = { min: -200, max: -100, current: -150 };
        amount.props = { value: 1 };
        await sleep(50);
      });

      it("it should handle negative max without errors", () => {
        const value = inspector.getValue();
        expect(value).to.be.a("number");
        expect(isNaN(value)).to.be.false;
      });
    });

    describe("when current is negative", () => {
      beforeEach(async () => {
        scale.props = { min: -200, max: -50, current: -100 };
        amount.props = { value: 0 };
        await sleep(50);
      });

      it("it should return current value", () => {
        const value = inspector.getValue();
        expect(value).to.be.closeTo(-100, 1);
      });
    });

    describe("when all values are negative", () => {
      beforeEach(async () => {
        scale.props = { min: -1000, max: -100, current: -500 };
        amount.props = { value: 0.5 };
        await sleep(50);
      });

      it("it should scale between current and max", () => {
        const value = inspector.getValue();
        expect(value).to.be.a("number");
        expect(isNaN(value)).to.be.false;
        expect(value).to.be.greaterThan(-500);
      });
    });
  });

  describe("mixed positive, negative, and zero values", () => {
    describe("when min is negative and max is positive with current at 0", () => {
      beforeEach(async () => {
        scale.props = { min: -50, max: 50, current: 0 };
        amount.props = { value: 0.5 };
        await sleep(50);
      });

      it("it should handle the range without errors", () => {
        const value = inspector.getValue();
        expect(value).to.be.a("number");
        expect(isNaN(value)).to.be.false;
      });
    });

    describe("when min is 0, max is positive, current is positive", () => {
      beforeEach(async () => {
        scale.props = { min: 0, max: 100, current: 50 };
        amount.props = { value: 0 };
        await sleep(50);
      });

      it("it should return current value", () => {
        const value = inspector.getValue();
        expect(value).to.be.closeTo(50, 1);
      });
    });

    describe("when min is negative, max is 0, current is negative", () => {
      beforeEach(async () => {
        scale.props = { min: -100, max: 0, current: -50 };
        amount.props = { value: 0 };
        await sleep(50);
      });

      it("it should return current value", () => {
        const value = inspector.getValue();
        expect(value).to.be.closeTo(-50, 1);
      });
    });

    describe("when min and current are negative, max is positive", () => {
      beforeEach(async () => {
        scale.props = { min: -100, max: 100, current: -50 };
        amount.props = { value: 1 };
        await sleep(50);
      });

      it("it should scale to max", () => {
        const value = inspector.getValue();
        expect(value).to.be.a("number");
        expect(isNaN(value)).to.be.false;
      });
    });
  });

  describe("linear mode", () => {
    beforeEach(async () => {
      scale.props = { mode: "linear" };
      await sleep(50);
    });

    describe("when amount is 1", () => {
      beforeEach(async () => {
        scale.props = { min: 20, max: 20000, current: 440, mode: "linear" };
        amount.props = { value: 1 };
        await sleep(50);
      });

      it("it returns max value", () => {
        expect(inspector.getValue()).to.be.closeTo(20000, 1);
      });
    });

    describe("when amount is -1", () => {
      beforeEach(async () => {
        scale.props = { min: 20, max: 20000, current: 440, mode: "linear" };
        amount.props = { value: -1 };
        await sleep(50);
      });

      it("it returns min value", () => {
        expect(inspector.getValue()).to.be.closeTo(20, 1);
      });
    });

    describe("when amount is 0", () => {
      beforeEach(async () => {
        scale.props = { min: 20, max: 20000, current: 440, mode: "linear" };
        amount.props = { value: 0 };
        await sleep(50);
      });

      it("it returns current value", () => {
        expect(inspector.getValue()).to.be.closeTo(440, 1);
      });
    });

    describe("when amount is 0.5", () => {
      beforeEach(async () => {
        scale.props = { min: 0, max: 100, current: 50, mode: "linear" };
        amount.props = { value: 0.5 };
        await sleep(50);
      });

      it("it returns value halfway between current and max", () => {
        expect(inspector.getValue()).to.be.closeTo(75, 1);
      });
    });

    describe("when amount is -0.5", () => {
      beforeEach(async () => {
        scale.props = { min: 0, max: 100, current: 50, mode: "linear" };
        amount.props = { value: -0.5 };
        await sleep(50);
      });

      it("it returns value halfway between current and min", () => {
        expect(inspector.getValue()).to.be.closeTo(25, 1);
      });
    });

    describe("with current at 0", () => {
      beforeEach(async () => {
        scale.props = { min: -50, max: 50, current: 0, mode: "linear" };
        amount.props = { value: 0.5 };
        await sleep(50);
      });

      it("it handles zero current value", () => {
        expect(inspector.getValue()).to.be.closeTo(25, 1);
      });
    });

    describe("with negative values", () => {
      beforeEach(async () => {
        scale.props = { min: -100, max: -20, current: -60, mode: "linear" };
        amount.props = { value: 0.5 };
        await sleep(50);
      });

      it("it scales linearly with negative values", () => {
        expect(inspector.getValue()).to.be.closeTo(-40, 1);
      });
    });
  });
});
