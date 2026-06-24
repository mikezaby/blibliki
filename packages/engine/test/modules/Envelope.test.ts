import type { TestContext } from "vitest";
import { describe, expect, it } from "vitest";
import Note from "@/core/Note";
import { ModuleType } from "@/modules";
import Constant from "@/modules/Constant";
import Envelope, { ICustomEnvelopeProps } from "@/modules/Envelope";
import Inspector from "@/modules/Inspector";
import { readInspectorPeak, waitForInspectorValue } from "../utils/audioWaits";
import { waitForAudioTime, waitForMicrotasks } from "../utils/waitForCondition";

const DEFAULT_PROPS = {
  attack: 0.01,
  attackCurve: 0.5,
  decay: 0.1,
  sustain: 0.7,
  release: 0.3,
  retrigger: true,
};

function createEnvelope(
  ctx: TestContext,
  props: ICustomEnvelopeProps = DEFAULT_PROPS,
) {
  const envelope = new Envelope(ctx.engine.id, {
    name: "envelope",
    moduleType: ModuleType.Envelope,
    props,
    voices: 1,
    monoModuleConstructor: () => {
      throw new Error("Not used in test");
    },
  });
  (
    ctx.engine as unknown as {
      modules: Map<string, Envelope>;
    }
  ).modules.set(envelope.id, envelope);

  return envelope;
}

function createConstant(ctx: TestContext, props: { value: number }) {
  const serialized = ctx.engine.addModule({
    name: "constant",
    moduleType: ModuleType.Constant,
    props,
  });

  return ctx.engine.findModule(serialized.id) as Constant;
}

function createInspector(ctx: TestContext, props: { fftSize?: number } = {}) {
  const serialized = ctx.engine.addModule({
    name: "inspector",
    moduleType: ModuleType.Inspector,
    props,
  });

  return ctx.engine.findModule(serialized.id) as Inspector;
}

describe("Envelope", () => {
  describe("Initialize", () => {
    it("has proper type", (ctx) => {
      const envelope = createEnvelope(ctx);

      expect(envelope.moduleType).toBe(ModuleType.Envelope);
    });

    it("has default ADSR values", (ctx) => {
      const envelope = createEnvelope(ctx);

      expect(envelope.props.attack).toBe(0.01);
      expect(envelope.props.decay).toBe(0.1);
      expect(envelope.props.sustain).toBe(0.7);
      expect(envelope.props.release).toBe(0.3);
      expect(envelope.props.retrigger).toBe(true);
    });

    it("accepts custom ADSR values", (ctx) => {
      const envelope = createEnvelope(ctx, {
        attack: 0.05,
        attackCurve: 0.5,
        decay: 0.2,
        sustain: 0.5,
        release: 0.5,
        retrigger: false,
      });

      expect(envelope.props.attack).toBe(0.05);
      expect(envelope.props.decay).toBe(0.2);
      expect(envelope.props.sustain).toBe(0.5);
      expect(envelope.props.release).toBe(0.5);
      expect(envelope.props.retrigger).toBe(false);
    });
  });

  describe("Triggering with Constant module", () => {
    it("should output silence when not triggered", async (ctx) => {
      const envelope = createEnvelope(ctx);
      const inspector = createInspector(ctx);

      await waitForMicrotasks();

      // Connect envelope audioNode to inspector
      const monoEnvelope = envelope.audioModules[0]!;
      (monoEnvelope.audioNode as AudioWorkletNode).connect(inspector.audioNode);

      const value = await waitForInspectorValue(
        inspector,
        (currentValue) => currentValue < 0.0001,
        { description: "silent envelope output" },
      );

      // Should be essentially silent (close to MIN_GAIN = 0.00001)
      expect(value).toBeLessThan(0.0001);
    });

    it("should rise during attack when triggered", async (ctx) => {
      const envelope = createEnvelope(ctx, {
        attack: 0.1, // 100ms attack
        attackCurve: 0.5,
        decay: 0.1,
        sustain: 0.7,
        release: 0.1,
        retrigger: true,
      });

      const constant = createConstant(ctx, {
        value: 1, // Trigger on
      });
      constant.start(ctx.context.currentTime);

      const inspector = createInspector(ctx);

      await waitForMicrotasks();

      // Get the mono envelope module
      const monoEnvelope = envelope.audioModules[0]!;
      const workletNode = monoEnvelope.audioNode as AudioWorkletNode;

      // Connect constant to trigger param
      constant.audioNode.connect(workletNode.parameters.get("trigger")!);

      // Connect envelope to inspector
      workletNode.connect(inspector.audioNode);

      const value = await waitForInspectorValue(
        inspector,
        (currentValue) => currentValue > 0.1,
        { description: "envelope attack rise" },
      );

      // Should be rising or have reached peak
      expect(value).toBeGreaterThan(0.1);
    });

    it("should reach sustain level and hold", async (ctx) => {
      const envelope = createEnvelope(ctx, {
        attack: 0.02, // 20ms attack (fast)
        attackCurve: 0.5,
        decay: 0.02, // 20ms decay (fast)
        sustain: 0.5,
        release: 0.1,
        retrigger: true,
      });

      const constant = createConstant(ctx, {
        value: 1, // Trigger on
      });
      constant.start(ctx.context.currentTime);

      const inspector = createInspector(ctx);

      await waitForMicrotasks();

      const monoEnvelope = envelope.audioModules[0]!;
      const workletNode = monoEnvelope.audioNode as AudioWorkletNode;
      constant.audioNode.connect(workletNode.parameters.get("trigger")!);
      workletNode.connect(inspector.audioNode);

      const value = await waitForInspectorValue(
        inspector,
        (currentValue) => currentValue > 0.4 && currentValue < 0.6,
        { description: "envelope sustain level" },
      );

      // Should be around sustain level (0.5)
      expect(value).toBeGreaterThan(0.4);
      expect(value).toBeLessThan(0.6);
    });

    it("should release when trigger goes to 0", async (ctx) => {
      const envelope = createEnvelope(ctx, {
        attack: 0.01, // 10ms attack (very fast)
        attackCurve: 0.5,
        decay: 0.01, // 10ms decay (very fast)
        sustain: 0.8,
        release: 0.05, // 50ms release
        retrigger: true,
      });

      const constant = createConstant(ctx, {
        value: 1, // Trigger on
      });
      constant.start(ctx.context.currentTime);

      const inspector = createInspector(ctx);

      await waitForMicrotasks();

      const monoEnvelope = envelope.audioModules[0]!;
      const workletNode = monoEnvelope.audioNode as AudioWorkletNode;
      constant.audioNode.connect(workletNode.parameters.get("trigger")!);
      workletNode.connect(inspector.audioNode);

      const sustainValue = await waitForInspectorValue(
        inspector,
        (currentValue) => currentValue > 0.7,
        { description: "envelope sustain before release" },
      );

      // Should be at sustain level
      expect(sustainValue).toBeGreaterThan(0.7);

      // Now release by setting constant to 0
      constant.props = { value: 0 };
      const releaseValue = await waitForInspectorValue(
        inspector,
        (currentValue) => currentValue < sustainValue - 0.05,
        { description: "envelope release drop" },
      );

      // Should be lower than sustain (releasing)
      expect(releaseValue).toBeLessThan(sustainValue);
    });

    it("should handle retriggering during release", async (ctx) => {
      const envelope = createEnvelope(ctx, {
        attack: 0.02,
        attackCurve: 0.5,
        decay: 0.02,
        sustain: 0.7,
        release: 0.2, // Long release (200ms)
        retrigger: true,
      });

      const constant = createConstant(ctx, {
        value: 1, // Trigger on
      });
      constant.start(ctx.context.currentTime);

      const inspector = createInspector(ctx);

      await waitForMicrotasks();

      const monoEnvelope = envelope.audioModules[0]!;
      const workletNode = monoEnvelope.audioNode as AudioWorkletNode;
      constant.audioNode.connect(workletNode.parameters.get("trigger")!);
      workletNode.connect(inspector.audioNode);

      await waitForInspectorValue(
        inspector,
        (currentValue) => currentValue > 0.6,
        { description: "envelope sustain before retrigger" },
      );

      // Release
      constant.props = { value: 0 };
      await waitForInspectorValue(
        inspector,
        (currentValue) => currentValue < 0.6,
        { description: "envelope release in progress" },
      );

      // Retrigger during release
      constant.props = { value: 1 };
      const value = await waitForInspectorValue(
        inspector,
        (currentValue) => currentValue > 0.5,
        { description: "envelope retrigger recovery" },
      );

      // Should be back at sustain level after retriggering
      expect(value).toBeGreaterThan(0.5);
    });

    it("treats decay and release as durations that reach their targets", async (ctx) => {
      const envelope = createEnvelope(ctx, {
        attack: 0.01,
        attackCurve: 0.5,
        decay: 0.04,
        sustain: 0.25,
        release: 0.04,
        retrigger: true,
      });

      const inspector = createInspector(ctx, {
        fftSize: 32,
      });

      await waitForMicrotasks();

      const monoEnvelope = envelope.audioModules[0]!;
      const workletNode = monoEnvelope.audioNode as AudioWorkletNode;
      const triggerParam = workletNode.parameters.get("trigger")!;
      workletNode.connect(inspector.audioNode);

      const attackStartTime = ctx.context.currentTime + 0.02;
      const decaySettleTime = attackStartTime + 0.01 + 0.04 + 0.01;
      const releaseStartTime = decaySettleTime + 0.03;

      triggerParam.setValueAtTime(1, attackStartTime);
      triggerParam.setValueAtTime(0, releaseStartTime);

      await waitForAudioTime(ctx.context, decaySettleTime, {
        description: "envelope decay duration to settle",
      });

      const sustainPeak = readInspectorPeak(inspector);
      expect(sustainPeak).toBeGreaterThan(0.2);
      expect(sustainPeak).toBeLessThan(0.3);

      await waitForAudioTime(ctx.context, releaseStartTime + 0.04 + 0.01, {
        description: "envelope release duration to settle",
      });

      const releasedPeak = readInspectorPeak(inspector);
      expect(releasedPeak).toBeLessThan(0.02);
    });

    it("restarts overlapping notes from the beginning by default", async (ctx) => {
      const envelope = createEnvelope(ctx, {
        attack: 0.05,
        attackCurve: 0.5,
        decay: 0.01,
        sustain: 0.8,
        release: 0.1,
        retrigger: true,
      });

      const inspector = createInspector(ctx, {
        fftSize: 32,
      });

      await waitForMicrotasks();

      const monoEnvelope = envelope.audioModules[0]!;
      (monoEnvelope.audioNode as AudioWorkletNode).connect(inspector.audioNode);

      const firstAttackTime = ctx.context.currentTime + 0.02;
      monoEnvelope.triggerAttack(new Note("C4"), firstAttackTime);

      await waitForAudioTime(ctx.context, firstAttackTime + 0.07, {
        description: "first envelope attack settling before retrigger",
      });

      const preRetriggerPeak = readInspectorPeak(inspector);
      expect(preRetriggerPeak).toBeGreaterThan(0.65);

      const retriggerTime = ctx.context.currentTime + 0.01;
      monoEnvelope.triggerAttack(new Note("E4"), retriggerTime);

      await waitForAudioTime(ctx.context, retriggerTime + 0.01, {
        description: "second note attack after default retrigger",
      });

      const retriggerPeak = readInspectorPeak(inspector);
      expect(retriggerPeak).toBeLessThan(preRetriggerPeak - 0.2);
    });

    it("restarts immediately played overlapping notes when retrigger is enabled", async (ctx) => {
      const envelope = createEnvelope(ctx, {
        attack: 0.05,
        attackCurve: 0.5,
        decay: 0.01,
        sustain: 0.8,
        release: 0.1,
        retrigger: true,
      });

      const inspector = createInspector(ctx, {
        fftSize: 32,
      });

      await waitForMicrotasks();

      const monoEnvelope = envelope.audioModules[0]!;
      (monoEnvelope.audioNode as AudioWorkletNode).connect(inspector.audioNode);

      const firstAttackTime = ctx.context.currentTime + 0.02;
      monoEnvelope.triggerAttack(new Note("C4"), firstAttackTime);

      await waitForAudioTime(ctx.context, firstAttackTime + 0.07, {
        description:
          "first envelope attack settling before immediate retrigger",
        intervalMs: 1,
      });

      monoEnvelope.triggerAttack(new Note("E4"), ctx.context.currentTime);

      await waitForAudioTime(ctx.context, ctx.context.currentTime + 0.01, {
        description: "immediate second note attack with retrigger",
        intervalMs: 1,
      });

      const retriggerPeak = readInspectorPeak(inspector);
      expect(retriggerPeak).toBeLessThan(0.4);
    });

    it("can keep overlapping notes legato when retrigger is disabled", async (ctx) => {
      const envelope = createEnvelope(ctx, {
        attack: 0.05,
        attackCurve: 0.5,
        decay: 0.01,
        sustain: 0.8,
        release: 0.1,
        retrigger: false,
      });

      const inspector = createInspector(ctx, {
        fftSize: 32,
      });

      await waitForMicrotasks();

      const monoEnvelope = envelope.audioModules[0]!;
      (monoEnvelope.audioNode as AudioWorkletNode).connect(inspector.audioNode);

      const firstAttackTime = ctx.context.currentTime + 0.02;
      monoEnvelope.triggerAttack(new Note("C4"), firstAttackTime);

      await waitForAudioTime(ctx.context, firstAttackTime + 0.07, {
        description: "first envelope attack settling before legato note",
      });

      const preLegatoPeak = readInspectorPeak(inspector);
      expect(preLegatoPeak).toBeGreaterThan(0.65);

      const secondNoteTime = ctx.context.currentTime + 0.01;
      monoEnvelope.triggerAttack(new Note("E4"), secondNoteTime);

      await waitForAudioTime(ctx.context, secondNoteTime + 0.01, {
        description: "second note without retriggering",
      });

      const legatoPeak = readInspectorPeak(inspector);
      expect(legatoPeak).toBeGreaterThan(0.65);
    });
  });

  describe("Parameter updates", () => {
    it("should update attack parameter", (ctx) => {
      const envelope = createEnvelope(ctx, { ...DEFAULT_PROPS, attack: 0.01 });

      envelope.props = { ...envelope.props, attack: 0.5 };
      expect(envelope.props.attack).toBe(0.5);
    });

    it("should update decay parameter", (ctx) => {
      const envelope = createEnvelope(ctx, { ...DEFAULT_PROPS, decay: 0.1 });

      envelope.props = { ...envelope.props, decay: 0.3 };
      expect(envelope.props.decay).toBe(0.3);
    });

    it("should update sustain parameter", (ctx) => {
      const envelope = createEnvelope(ctx, { ...DEFAULT_PROPS, sustain: 0.7 });

      envelope.props = { ...envelope.props, sustain: 0.4 };
      expect(envelope.props.sustain).toBe(0.4);
    });

    it("should update release parameter", (ctx) => {
      const envelope = createEnvelope(ctx, { ...DEFAULT_PROPS, release: 0.3 });

      envelope.props = { ...envelope.props, release: 0.8 };
      expect(envelope.props.release).toBe(0.8);
    });

    it("should update retrigger parameter", (ctx) => {
      const envelope = createEnvelope(ctx, {
        ...DEFAULT_PROPS,
        retrigger: true,
      });

      envelope.props = { ...envelope.props, retrigger: false };
      expect(envelope.props.retrigger).toBe(false);
    });
  });
});
