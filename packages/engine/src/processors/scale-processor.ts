export const scaleProcessorURL = URL.createObjectURL(
  new Blob(
    [
      "(",
      (() => {
        class ScaleProcessor extends AudioWorkletProcessor {
          static get parameterDescriptors() {
            return [
              {
                name: "min",
                defaultValue: 1e-10,
              },
              {
                name: "max",
                defaultValue: 1,
              },
              {
                name: "current",
                defaultValue: 0.5,
              },
              {
                name: "mode",
                defaultValue: 0, // 0 = exponential, 1 = linear
              },
            ];
          }

          process(
            inputs: Float32Array[][],
            outputs: Float32Array[][],
            parameters: Record<string, Float32Array>,
          ) {
            const input = inputs[0];
            const output = outputs[0];
            if (!input || !output) return true;

            const minValues = parameters.min;
            const maxValues = parameters.max;
            const currentValues = parameters.current;
            const modeValues = parameters.mode;
            if (!minValues || !maxValues || !currentValues || !modeValues)
              return true;

            const firstInput = input[0];
            if (!firstInput || firstInput.length === 0) {
              for (const outputChannel of output) {
                const current =
                  currentValues.length > 1
                    ? (currentValues[0] ?? 0.5)
                    : (currentValues[0] ?? 0.5);

                outputChannel.fill(current);
              }

              return true;
            }

            for (let channel = 0; channel < input.length; channel++) {
              const inputChannel = input[channel];
              const outputChannel = output[channel];
              if (!inputChannel || !outputChannel) continue;

              for (let i = 0; i < inputChannel.length; i++) {
                const x = inputChannel[i];
                if (x === undefined) continue;

                const min =
                  minValues.length > 1
                    ? (minValues[i] ?? minValues[0])
                    : minValues[0];
                const max =
                  maxValues.length > 1
                    ? (maxValues[i] ?? maxValues[0])
                    : maxValues[0];
                const current =
                  currentValues.length > 1
                    ? (currentValues[i] ?? currentValues[0])
                    : currentValues[0];
                const mode =
                  modeValues.length > 1
                    ? (modeValues[i] ?? modeValues[0])
                    : modeValues[0];

                if (
                  min === undefined ||
                  max === undefined ||
                  current === undefined ||
                  mode === undefined
                )
                  continue;

                const isLinearMode = mode >= 0.5; // 0 = exponential, 1 = linear

                if (isLinearMode) {
                  // Linear interpolation
                  if (x < 0) {
                    outputChannel[i] = current + -x * (min - current);
                  } else {
                    outputChannel[i] = current + x * (max - current);
                  }
                } else {
                  // Exponential scaling
                  // Handle edge cases where exponential would fail
                  if (
                    current === 0 ||
                    (x < 0 && min === 0) ||
                    (x > 0 && max === 0)
                  ) {
                    // Fallback to linear for invalid exponential cases
                    if (x < 0) {
                      outputChannel[i] = current + -x * (min - current);
                    } else {
                      outputChannel[i] = current + x * (max - current);
                    }
                  } else {
                    if (x < 0) {
                      outputChannel[i] = current * Math.pow(min / current, -x);
                    } else {
                      outputChannel[i] = current * Math.pow(max / current, x);
                    }
                  }
                }
              }
            }

            return true;
          }
        }

        registerProcessor("scale-processor", ScaleProcessor);
      }).toString(),
      ")()",
    ],
    { type: "application/javascript" },
  ),
);
