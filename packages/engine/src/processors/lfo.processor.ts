import type { ProcessorDefinition, ProcessFunction } from "@blibliki/utils";

// LFO. Per-instance phase + sample-and-hold random value are passed in as state
// and mutated in place; sampleRate comes from ctx. See scale.processor.ts for
// the self-containment rules.
const lfoProcess: ProcessFunction = (
  _inputs,
  outputs,
  framesToProcess,
  params,
  state,
  ctx,
) => {
  const frequencyValues = params.frequency;
  const waveformValues = params.waveform;
  const phaseValues = params.phase;
  if (!frequencyValues || !waveformValues || !phaseValues) return;

  const sampleRate = ctx.sampleRate;

  // Read persisted state into locals (fast path), write back after the block.
  const s = state as { phase: number; randomValue: number };
  let phase = s.phase;
  let randomValue = s.randomValue;

  for (let i = 0; i < framesToProcess; i++) {
    const frequency =
      frequencyValues.length > 1
        ? (frequencyValues[i] ?? 1.0)
        : (frequencyValues[0] ?? 1.0);
    const waveformIdx = Math.round(
      waveformValues.length > 1
        ? (waveformValues[i] ?? 0)
        : (waveformValues[0] ?? 0),
    );
    const phaseOffset =
      phaseValues.length > 1 ? (phaseValues[i] ?? 0) : (phaseValues[0] ?? 0);

    const currentPhase = (phase + phaseOffset) % 1.0;

    let sample: number;
    switch (waveformIdx) {
      case 0: // Sine
        sample = Math.sin(2 * Math.PI * currentPhase);
        break;
      case 1: // Triangle
        sample = 2 * Math.abs(2 * currentPhase - 1) - 1;
        break;
      case 2: // Square
        sample = currentPhase < 0.5 ? 1 : -1;
        break;
      case 3: // Sawtooth
        sample = 2 * currentPhase - 1;
        break;
      case 4: // Ramp Down
        sample = 1 - 2 * currentPhase;
        break;
      case 5: // Random (sample & hold)
        sample = randomValue;
        break;
      default:
        sample = Math.sin(2 * Math.PI * currentPhase);
    }

    for (const channel of outputs) channel[i] = sample;

    phase += frequency / sampleRate;
    if (phase >= 1.0) {
      phase -= 1.0;
      if (waveformIdx === 5) randomValue = Math.random() * 2 - 1;
    }
  }

  s.phase = phase;
  s.randomValue = randomValue;
};

const lfoProcessor: ProcessorDefinition = {
  name: "lfo-processor",
  parameterDescriptors: [
    { name: "frequency", defaultValue: 1.0, minValue: 0.01, maxValue: 100 },
    // 0=sine, 1=triangle, 2=square, 3=sawtooth, 4=rampDown, 5=random
    { name: "waveform", defaultValue: 0, minValue: 0, maxValue: 5 },
    { name: "phase", defaultValue: 0.0, minValue: 0.0, maxValue: 1.0 },
  ],
  process: lfoProcess,
  createState: () => ({ phase: 0, randomValue: Math.random() * 2 - 1 }),
};

export default lfoProcessor;
