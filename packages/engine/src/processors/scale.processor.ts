import type {
  NativeWorkletDefinition,
  NativeWorkletProcess,
} from "@blibliki/utils";

// ONE self-contained, statically-declared top-level "worklet" function, used by
// both platforms: web embeds its source into the AudioWorklet Blob; native
// captures it directly (the babel plugin workletizes it). No duplication.
// MUST stay self-contained (no imports, no module-scope refs) for both to work.
const scaleProcess: NativeWorkletProcess = (
  inputs,
  outputs,
  framesToProcess,
  params,
) => {
  "worklet";
  const min = params.min?.[0] ?? 1e-10;
  const max = params.max?.[0] ?? 1;
  const current = params.current?.[0] ?? 0.5;
  const isLinear = (params.mode?.[0] ?? 0) >= 0.5; // 0 = exponential, 1 = linear

  const firstInput = inputs[0];
  if (!firstInput || firstInput.length === 0) {
    // No input connected: emit `current`.
    for (const outputChannel of outputs) outputChannel.fill(current);
    return;
  }

  for (let channel = 0; channel < inputs.length; channel++) {
    const inputChannel = inputs[channel];
    const outputChannel = outputs[channel];
    if (!inputChannel || !outputChannel) continue;

    for (let i = 0; i < framesToProcess; i++) {
      const x = inputChannel[i];
      if (x === undefined) continue;

      if (isLinear) {
        outputChannel[i] =
          x < 0
            ? current + -x * (min - current)
            : current + x * (max - current);
        continue;
      }

      // Exponential scaling; fall back to linear where exponential is invalid.
      if (current === 0 || (x < 0 && min === 0) || (x > 0 && max === 0)) {
        outputChannel[i] =
          x < 0
            ? current + -x * (min - current)
            : current + x * (max - current);
      } else {
        outputChannel[i] =
          x < 0
            ? current * Math.pow(min / current, -x)
            : current * Math.pow(max / current, x);
      }
    }
  }
};

const scaleProcessor: NativeWorkletDefinition = {
  name: "scale-processor",
  parameterDescriptors: [
    { name: "min", defaultValue: 1e-10 },
    { name: "max", defaultValue: 1 },
    { name: "current", defaultValue: 0.5 },
    { name: "mode", defaultValue: 0 }, // 0 = exponential, 1 = linear
  ],
  process: scaleProcess,
};

export default scaleProcessor;
