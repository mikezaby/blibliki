import type {
  NativeWorkletDefinition,
  NativeWorkletProcess,
} from "@blibliki/utils";

// ADSR envelope with a-rate trigger/reset. ONE self-contained top-level "worklet"
// function (web embeds it, native workletizes it); per-instance state is passed
// in and mutated in place. See scale.processor.ts for the self-containment rules.
//
// State fields: lasttrig, trig, lastReset, reset, stage (0=idle 1=atk 2=dec
// 3=sus 4=rel), value.
const customEnvelopeProcess: NativeWorkletProcess = (
  _inputs,
  outputs,
  framesToProcess,
  params,
  state,
  ctx,
) => {
  "worklet";
  const output = outputs;
  if (!output[0]) return;

  const STATE_IDLE = 0;
  const STATE_ATTACK = 1;
  const STATE_DECAY = 2;
  const STATE_SUSTAIN = 3;
  const STATE_RELEASE = 4;
  const TARGET_EPSILON = 0.001;

  const sampleRate = ctx.sampleRate;

  const durationToTargetRatio = (duration: number) =>
    duration <= 0
      ? 1
      : 1 - Math.pow(TARGET_EPSILON, 1 / Math.max(1, sampleRate * duration));

  const trigs = params.trigger;
  const resets = params.reset;
  const atk = params.attack?.[0] ?? 0.1;
  const dec = params.decay?.[0] ?? 0.1;
  const sus = params.sustain?.[0] ?? 1;
  const rel = params.release?.[0] ?? 0.1;
  const atkmax = 1.01 / Math.max(0.01, params.attackcurve?.[0] ?? 0.5);
  const atkRatio =
    atk <= 0 ? 1 : 1 - Math.pow(1 - 1 / atkmax, 1 / (sampleRate * atk));
  const decRatio = durationToTargetRatio(dec);
  const relRatio = durationToTargetRatio(rel);

  // Read persisted state into locals (fast path), write back after the block.
  const s = state as {
    lasttrig: number;
    trig: number;
    lastReset: number;
    reset: number;
    stage: number;
    value: number;
  };
  let lasttrig = s.lasttrig;
  let trig = s.trig;
  let lastReset = s.lastReset;
  let reset = s.reset;
  let stage = s.stage;
  let value = s.value;

  if (trigs?.length === 1) trig = trigs[0]!;
  if (resets?.length === 1) reset = resets[0]!;

  for (let i = 0; i < framesToProcess; ++i) {
    if (trigs && trigs.length > 1) trig = trigs[i]!;
    if (resets && resets.length > 1) reset = resets[i]!;

    const isTriggered = trig >= 0.5;
    const wasTriggered = lasttrig >= 0.5;
    const resetChanged = reset !== lastReset;

    if (resetChanged) {
      if (atk <= 0) {
        value = 1;
        stage = value > sus ? STATE_DECAY : STATE_SUSTAIN;
      } else {
        value = 0;
        stage = STATE_ATTACK;
      }
    }

    // Rising edge starts a fresh attack from the current value.
    if (isTriggered && !wasTriggered) {
      if (atk <= 0) {
        value = 1;
        stage = value > sus ? STATE_DECAY : STATE_SUSTAIN;
      } else {
        stage = STATE_ATTACK;
      }
    }

    // Falling edge releases from the current value.
    if (!isTriggered && wasTriggered) {
      if (rel <= 0) {
        value = 0;
        stage = STATE_IDLE;
      } else {
        stage = STATE_RELEASE;
      }
    }

    switch (stage) {
      case STATE_ATTACK:
        value += (atkmax - value) * atkRatio;
        if (value >= 1.0) {
          value = 1.0;
          stage = value > sus ? STATE_DECAY : STATE_SUSTAIN;
        }
        break;

      case STATE_DECAY:
        value += (sus - value) * decRatio;
        if (value <= sus || Math.abs(value - sus) <= TARGET_EPSILON) {
          value = sus;
          stage = STATE_SUSTAIN;
        }
        break;

      case STATE_SUSTAIN:
        value = sus;
        break;

      case STATE_RELEASE:
        value += -value * relRatio;
        if (value <= TARGET_EPSILON) {
          value = 0;
          stage = STATE_IDLE;
        }
        break;

      case STATE_IDLE:
      default:
        value = 0;
        stage = STATE_IDLE;
        break;
    }

    value = Math.min(1, Math.max(0, value));

    for (const channel of output) channel[i] = value;

    lasttrig = trig;
    lastReset = reset;
  }

  s.lasttrig = lasttrig;
  s.trig = trig;
  s.lastReset = lastReset;
  s.reset = reset;
  s.stage = stage;
  s.value = value;
};

const customEnvelopeProcessor: NativeWorkletDefinition = {
  name: "custom-envelope-processor",
  parameterDescriptors: [
    {
      name: "attack",
      defaultValue: 0.1,
      minValue: 0,
      maxValue: 60,
      automationRate: "k-rate",
    },
    {
      name: "attackcurve",
      defaultValue: 0.5,
      minValue: 0,
      maxValue: 1,
      automationRate: "k-rate",
    },
    {
      name: "decay",
      defaultValue: 0.1,
      minValue: 0,
      maxValue: 60,
      automationRate: "k-rate",
    },
    {
      name: "sustain",
      defaultValue: 1,
      minValue: 0,
      maxValue: 1,
      automationRate: "k-rate",
    },
    {
      name: "release",
      defaultValue: 0.1,
      minValue: 0,
      maxValue: 60,
      automationRate: "k-rate",
    },
    {
      name: "trigger",
      defaultValue: 0,
      minValue: 0,
      maxValue: 1,
      automationRate: "a-rate",
    },
    {
      name: "reset",
      defaultValue: 0,
      minValue: 0,
      maxValue: 1,
      automationRate: "a-rate",
    },
  ],
  process: customEnvelopeProcess,
  createState: () => ({
    lasttrig: 0,
    trig: 0,
    lastReset: 0,
    reset: 0,
    stage: 0,
    value: 0,
  }),
};

export default customEnvelopeProcessor;
