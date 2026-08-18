import type {
  NativeWorkletDefinition,
  NativeWorkletProcess,
} from "@blibliki/utils";

// State-variable-ish lowpass. ONE self-contained top-level "worklet" function
// (web embeds it, native workletizes it); per-instance state (s0, s1) is passed
// in and mutated in place. See scale.processor.ts for the self-containment rules.
const filterProcess: NativeWorkletProcess = (
  inputs,
  outputs,
  framesToProcess,
  params,
  state,
) => {
  "worklet";
  const cutoff = params.cutoff;
  const resonance = params.resonance;
  if (!cutoff || !resonance) return;

  // Read persisted state into locals (fast path), write back after the block.
  const s = state as { s0: number; s1: number };
  let s0 = s.s0;
  let s1 = s.s1;

  for (let channelNum = 0; channelNum < inputs.length; channelNum++) {
    const inputChannel = inputs[channelNum];
    const outputChannel = outputs[channelNum];
    if (!inputChannel || !outputChannel) continue;

    for (let i = 0; i < framesToProcess; i++) {
      const s = inputChannel[i];
      if (s === undefined) continue;

      // Convert Hz to normalized frequency using a logarithmic scale.
      const cutoffHz = cutoff.length > 1 ? (cutoff[i] ?? cutoff[0]) : cutoff[0];
      if (cutoffHz === undefined) continue;

      const clampedHz = Math.max(20, Math.min(20000, cutoffHz));
      const normalizedCutoff = Math.log(clampedHz / 20) / Math.log(20000 / 20);
      const c = Math.pow(0.5, (1 - normalizedCutoff) / 0.125);

      const resonanceValue =
        resonance.length > 1 ? (resonance[i] ?? resonance[0]) : resonance[0];
      if (resonanceValue === undefined) continue;

      const r = Math.pow(0.5, (resonanceValue + 0.125) / 0.125);
      const mrc = 1 - r * c;

      s0 = mrc * s0 - c * s1 + c * s;
      s1 = mrc * s1 + c * s0;

      outputChannel[i] = s1;
    }
  }

  s.s0 = s0;
  s.s1 = s1;
};

const filterProcessor: NativeWorkletDefinition = {
  name: "filter-processor",
  parameterDescriptors: [
    { name: "cutoff", defaultValue: 1000, minValue: 20, maxValue: 20000 },
    { name: "resonance", defaultValue: 0.0, minValue: 0.0, maxValue: 4.0 },
  ],
  process: filterProcess,
  createState: () => ({ s0: 0, s1: 0 }),
};

export default filterProcessor;
