export const lfoProcessorURL = URL.createObjectURL(
  new Blob(
    [
      "(",
      (() => {
        class LFOProcessor extends AudioWorkletProcessor {
          private phase = 0;
          private randomValue = Math.random() * 2 - 1;

          static get parameterDescriptors() {
            return [
              {
                name: "frequency",
                defaultValue: 1.0,
                minValue: 0.01,
                maxValue: 100,
              },
              {
                name: "waveform",
                defaultValue: 0, // 0=sine, 1=triangle, 2=square, 3=sawtooth, 4=rampDown, 5=random
                minValue: 0,
                maxValue: 5,
              },
              {
                name: "phase",
                defaultValue: 0.0,
                minValue: 0.0,
                maxValue: 1.0,
              },
            ];
          }

          process(
            _inputs: Float32Array[][],
            outputs: Float32Array[][],
            parameters: Record<string, Float32Array>,
          ) {
            const output = outputs[0];
            if (!output) return true;

            const frequencyValues = parameters.frequency;
            const waveformValues = parameters.waveform;
            const phaseValues = parameters.phase;

            if (!frequencyValues || !waveformValues || !phaseValues)
              return true;

            const blockSize = output[0]?.length ?? 128;

            for (let i = 0; i < blockSize; i++) {
              // Get parameter values (can be per-sample or per-block)
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
                phaseValues.length > 1
                  ? (phaseValues[i] ?? 0)
                  : (phaseValues[0] ?? 0);

              // Calculate current phase with offset
              const currentPhase = (this.phase + phaseOffset) % 1.0;

              // Generate sample based on waveform type
              let sample = 0;
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
                  sample = this.randomValue;
                  break;
                default:
                  sample = Math.sin(2 * Math.PI * currentPhase);
              }

              // Write to all output channels
              for (const channel of output) {
                channel[i] = sample;
              }

              // Update phase
              const phaseIncrement = frequency / sampleRate;
              this.phase += phaseIncrement;

              // Wrap phase and update random value on wrap
              if (this.phase >= 1.0) {
                this.phase -= 1.0;
                // Update random value only for random waveform
                if (waveformIdx === 5) {
                  this.randomValue = Math.random() * 2 - 1;
                }
              }
            }

            return true;
          }
        }

        registerProcessor("lfo-processor", LFOProcessor);
      }).toString(),
      ")()",
    ],
    { type: "application/javascript" },
  ),
);
