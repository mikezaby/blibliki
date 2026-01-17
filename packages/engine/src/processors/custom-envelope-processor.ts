export const customEnvelopeProcessorURL = URL.createObjectURL(
  new Blob(
    [
      "(",
      (() => {
        class CustomEnvelopeProcessor extends AudioWorkletProcessor {
          private _lasttrig = 0;
          private _trig = 0;
          private _phase = 0;
          private _value = 0;

          static get parameterDescriptors() {
            return [
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
            ];
          }

          process(
            _inputs: Float32Array[][],
            outputs: Float32Array[][],
            parameters: Record<string, Float32Array>,
          ) {
            const output = outputs[0];
            if (!output?.[0]) return true;

            const trigs = parameters.trigger;
            const atk = parameters.attack![0]!;
            const dec = parameters.decay![0]!;
            const sus = parameters.sustain![0]!;
            const rel = parameters.release![0]!;
            const atkmax = 1.01 / Math.max(0.01, parameters.attackcurve![0]!);
            const atkRatio =
              1 - Math.pow(1 - 1 / atkmax, 1 / (sampleRate * atk));
            const decRatio = 1 - Math.pow(0.36787944, 1 / (sampleRate * dec));
            const relRatio = 1 - Math.pow(0.36787944, 1 / (sampleRate * rel));

            if (trigs?.length === 1) this._trig = trigs[0]!;

            for (let i = 0; i < output[0].length; ++i) {
              if (trigs && trigs.length > 1) this._trig = trigs[i]!;

              // Trigger detection - only detect rising edge
              if (this._trig >= 0.5 && this._lasttrig < 0.5) {
                this._phase = 1; // Start attack on rising edge
              }

              // Attack phase
              if (this._phase === 1) {
                this._value += (atkmax - this._value) * atkRatio;
                if (this._value >= 1.0) {
                  this._value = 1.0;
                  this._phase = 2; // Move to sustain/decay phase
                }
              }
              // Decay phase (only while trigger is held and not in attack)
              else if (this._trig >= 0.5 && this._value > sus) {
                this._value += (sus - this._value) * decRatio;
              }

              // Release phase
              if (this._trig < 0.5) {
                this._value += -this._value * relRatio;
                // Reset phase when envelope completes
                if (this._value < 0.001) {
                  this._value = 0;
                  this._phase = 0;
                }
              }

              for (const channel of output) {
                channel[i] = this._value;
              }

              this._lasttrig = this._trig;
            }

            return true;
          }
        }

        registerProcessor("custom-envelope-processor", CustomEnvelopeProcessor);
      }).toString(),
      ")()",
    ],
    { type: "application/javascript" },
  ),
);
