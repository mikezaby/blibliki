export const filterProcessorURL = URL.createObjectURL(
  new Blob(
    [
      "(",
      (() => {
        class FilterProcessor extends AudioWorkletProcessor {
          s0: number;
          s1: number;

          constructor() {
            super();
            this.s0 = 0;
            this.s1 = 0;
          }

          static get parameterDescriptors() {
            return [
              {
                name: "cutoff",
                defaultValue: 1000,
                minValue: 20,
                maxValue: 20000,
              },
              {
                name: "resonance",
                defaultValue: 0.0,
                minValue: 0.0,
                maxValue: 4.0,
              },
            ];
          }

          process(
            inputs: Float32Array[][],
            outputs: Float32Array[][],
            parameters: Record<string, Float32Array>,
          ): boolean {
            const input = inputs[0];
            const output = outputs[0];

            const cutoff = parameters.cutoff;
            const resonance = parameters.resonance;

            for (let channelNum = 0; channelNum < input.length; channelNum++) {
              const inputChannel = input[channelNum];
              const outputChannel = output[channelNum];

              for (let i = 0; i < inputChannel.length; i++) {
                const s = inputChannel[i];
                // Convert Hz to normalized frequency using logarithmic scale
                // This better matches human hearing perception
                const cutoffHz = cutoff.length > 1 ? cutoff[i] : cutoff[0];
                const clampedHz = Math.max(20, Math.min(20000, cutoffHz));
                const normalizedCutoff =
                  Math.log(clampedHz / 20) / Math.log(20000 / 20);
                const c = Math.pow(0.5, (1 - normalizedCutoff) / 0.125);
                const r = Math.pow(
                  0.5,
                  ((resonance.length > 1 ? resonance[i] : resonance[0]) +
                    0.125) /
                    0.125,
                );
                const mrc = 1 - r * c;

                this.s0 = mrc * this.s0 - c * this.s1 + c * s;
                this.s1 = mrc * this.s1 + c * this.s0;

                outputChannel[i] = this.s1;
              }
            }

            return true;
          }
        }

        registerProcessor("filter-processor", FilterProcessor);
      }).toString(),
      ")()",
    ],
    { type: "application/javascript" },
  ),
);
