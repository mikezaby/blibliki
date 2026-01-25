import { sleep } from "@blibliki/utils";
import { describe, it, expect, beforeEach } from "vitest";
import { Module } from "@/core/module/Module";
import { createModule, ModuleType } from "@/modules";
import Constant from "@/modules/Constant";
import { MonoGain } from "@/modules/Gain";
import Inspector from "@/modules/Inspector";

describe("Gain", () => {
  let gain: MonoGain;
  let audioSource: Constant;
  let inspector: Inspector;

  beforeEach((ctx) => {
    gain = Module.create(MonoGain, ctx.engine.id, {
      name: "gain",
      moduleType: ModuleType.Gain,
      props: { gain: 1 },
    });

    audioSource = createModule(ctx.engine.id, {
      name: "audioSource",
      moduleType: ModuleType.Constant,
      props: { value: 1 },
    }) as Constant;
    audioSource.start(ctx.context.currentTime);

    inspector = createModule(ctx.engine.id, {
      name: "inspector",
      moduleType: ModuleType.Inspector,
      props: {},
    }) as Inspector;

    audioSource.audioNode.connect(gain.audioNode);
    gain.audioNode.connect(inspector.audioNode);
  });

  describe("Initialize", () => {
    describe("with default gain value", () => {
      beforeEach(async () => {
        await sleep(50);
      });

      it("should pass through audio with gain = 1", () => {
        const value = inspector.getValue();
        expect(value).to.be.closeTo(1, 0.1);
      });
    });

    describe("with custom gain value", () => {
      beforeEach(async () => {
        gain.props = { gain: 0.5 };
        await sleep(50);
      });

      it("should apply the gain value", () => {
        const value = inspector.getValue();
        expect(value).to.be.closeTo(0.5, 0.1);
      });
    });
  });

  describe("Update gain value", () => {
    describe("when gain is set to 0", () => {
      beforeEach(async () => {
        gain.props = { gain: 0 };
        await sleep(50);
      });

      it("should silence the audio", () => {
        const value = inspector.getValue();
        expect(value).to.be.closeTo(0, 0.01);
      });
    });

    describe("when gain is increased to 2", () => {
      beforeEach(async () => {
        gain.props = { gain: 2 };
        await sleep(50);
      });

      it("should amplify the signal", () => {
        const value = inspector.getValue();
        expect(value).to.be.closeTo(2, 0.1);
      });
    });

    describe("when gain is set to a very small value", () => {
      beforeEach(async () => {
        gain.props = { gain: 0.01 };
        await sleep(50);
      });

      it("should significantly attenuate the signal", () => {
        const value = inspector.getValue();
        expect(value).to.be.closeTo(0.01, 0.01);
      });
    });
  });

  describe("Gain modulation via audio input", () => {
    let modulationSource: Constant;

    beforeEach(() => {
      modulationSource = createModule(gain.engineId, {
        name: "modulationSource",
        moduleType: ModuleType.Constant,
        props: { value: 0.5 },
      }) as Constant;
      modulationSource.start(0);
    });

    describe("when modulation is connected to gain input", () => {
      beforeEach(async () => {
        gain.props = { gain: 0 };
        modulationSource.plug({ audioModule: gain, from: "out", to: "gain" });
        await sleep(50);
      });

      it("should modulate the gain value", () => {
        const value = inspector.getValue();
        expect(value).to.be.closeTo(0.5, 0.1);
      });
    });

    describe("when modulation value changes", () => {
      beforeEach(async () => {
        gain.props = { gain: 0 };
        modulationSource.plug({ audioModule: gain, from: "out", to: "gain" });
        await sleep(50);
        modulationSource.props = { value: 1 };
        await sleep(50);
      });

      it("should reflect the new modulation value", () => {
        const value = inspector.getValue();
        expect(value).to.be.closeTo(1, 0.1);
      });
    });

    describe("when modulation affects final gain", () => {
      beforeEach(async () => {
        gain.props = { gain: 0.5 };
        modulationSource.props = { value: 0.5 };
        modulationSource.plug({ audioModule: gain, from: "out", to: "gain" });
        await sleep(50);
      });

      it("should combine base gain with modulation", () => {
        const value = inspector.getValue();
        // Base gain (0.5) + modulation (0.5) = 1.0, applied to audioSource value of 1
        expect(value).to.be.closeTo(1, 0.2);
      });
    });
  });

  describe("Edge cases", () => {
    describe("when gain is at minimum (0)", () => {
      beforeEach(async () => {
        gain.props = { gain: 0 };
        await sleep(50);
      });

      it("should output silence", () => {
        const value = inspector.getValue();
        expect(value).to.be.closeTo(0, 0.01);
      });
    });

    describe("when gain is very large", () => {
      beforeEach(async () => {
        gain.props = { gain: 100 };
        await sleep(50);
      });

      it("should handle large gain values without errors", () => {
        const value = inspector.getValue();
        expect(value).to.be.a("number");
        expect(isNaN(value)).to.be.false;
        expect(isFinite(value)).to.be.true;
      });
    });
  });
});
