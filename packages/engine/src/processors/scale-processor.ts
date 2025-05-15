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
            ];
          }

          process(
            inputs: Float32Array[][],
            outputs: Float32Array[][],
            parameters: Record<string, Float32Array>,
          ) {
            const input = inputs[0];
            const output = outputs[0];

            const minValues = parameters.min;
            const maxValues = parameters.max;
            const currentValues = parameters.current;

            if (!input.length || input[0].length === 0) {
              for (let channel = 0; channel < output.length; channel++) {
                const outputChannel = output[channel];
                const current =
                  parameters.current.length > 1
                    ? parameters.current[0]
                    : parameters.current[0];

                outputChannel.fill(current);
              }

              return true;
            }

            for (let channel = 0; channel < input.length; channel++) {
              const inputChannel = input[channel];
              const outputChannel = output[channel];

              for (let i = 0; i < inputChannel.length; i++) {
                const x = inputChannel[i];

                const min = minValues.length > 1 ? minValues[i] : minValues[0];
                const max = maxValues.length > 1 ? maxValues[i] : maxValues[0];
                const current =
                  currentValues.length > 1
                    ? currentValues[i]
                    : currentValues[0];

                if (x < 0) {
                  outputChannel[i] = current * Math.pow(min / current, -x);
                } else {
                  outputChannel[i] = current * Math.pow(max / current, x);
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
