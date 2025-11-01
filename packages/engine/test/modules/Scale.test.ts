import { sleep } from "@blibliki/utils";
import { describe, it, expect, beforeEach } from "vitest";
import { createModule, ModuleType } from "@/modules";
import Constant from "@/modules/Constant";
import Inspector from "@/modules/Inspector";
import Scale from "@/modules/Scale";

describe("Scale", () => {
  let scale: Scale;
  let amount: Constant;
  let inspector: Inspector;

  beforeEach((ctx) => {
    scale = createModule(ctx.engine.id, {
      name: "filterScale",
      moduleType: ModuleType.Scale,
      props: { min: 20, max: 20000, current: 440 },
    }) as Scale;

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
});
