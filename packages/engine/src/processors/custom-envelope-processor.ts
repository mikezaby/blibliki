export const customEnvelopeProcessorURL = URL.createObjectURL(
  new Blob(
    [
      "(",
      (() => {
        const STATE_IDLE = 0;
        const STATE_ATTACK = 1;
        const STATE_DECAY = 2;
        const STATE_SUSTAIN = 3;
        const STATE_RELEASE = 4;
        const TARGET_EPSILON = 0.001;

        class CustomEnvelopeProcessor extends AudioWorkletProcessor {
          private _lasttrig = 0;
          private _trig = 0;
          private _lastReset = 0;
          private _reset = 0;
          private _state = STATE_IDLE;
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
              {
                name: "reset",
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

            const durationToTargetRatio = (duration: number) =>
              duration <= 0
                ? 1
                : 1 -
                  Math.pow(
                    TARGET_EPSILON,
                    1 / Math.max(1, sampleRate * duration),
                  );

            const trigs = parameters.trigger;
            const resets = parameters.reset;
            const atk = parameters.attack![0]!;
            const dec = parameters.decay![0]!;
            const sus = parameters.sustain![0]!;
            const rel = parameters.release![0]!;
            const atkmax = 1.01 / Math.max(0.01, parameters.attackcurve![0]!);
            const atkRatio =
              atk <= 0
                ? 1
                : 1 - Math.pow(1 - 1 / atkmax, 1 / (sampleRate * atk));
            const decRatio = durationToTargetRatio(dec);
            const relRatio = durationToTargetRatio(rel);

            if (trigs?.length === 1) this._trig = trigs[0]!;
            if (resets?.length === 1) this._reset = resets[0]!;

            for (let i = 0; i < output[0].length; ++i) {
              if (trigs && trigs.length > 1) this._trig = trigs[i]!;
              if (resets && resets.length > 1) this._reset = resets[i]!;

              const isTriggered = this._trig >= 0.5;
              const wasTriggered = this._lasttrig >= 0.5;
              const isReset = this._reset >= 0.5;
              const wasReset = this._lastReset >= 0.5;

              if (isReset && !wasReset) {
                if (atk <= 0) {
                  this._value = 1;
                  this._state = this._value > sus ? STATE_DECAY : STATE_SUSTAIN;
                } else {
                  this._value = 0;
                  this._state = STATE_ATTACK;
                }
              }

              // Rising edge starts a fresh attack from the current value.
              if (isTriggered && !wasTriggered) {
                if (atk <= 0) {
                  this._value = 1;
                  this._state = this._value > sus ? STATE_DECAY : STATE_SUSTAIN;
                } else {
                  this._state = STATE_ATTACK;
                }
              }

              // Falling edge releases from the current value.
              if (!isTriggered && wasTriggered) {
                if (rel <= 0) {
                  this._value = 0;
                  this._state = STATE_IDLE;
                } else {
                  this._state = STATE_RELEASE;
                }
              }

              switch (this._state) {
                case STATE_ATTACK:
                  this._value += (atkmax - this._value) * atkRatio;
                  if (this._value >= 1.0) {
                    this._value = 1.0;
                    this._state =
                      this._value > sus ? STATE_DECAY : STATE_SUSTAIN;
                  }
                  break;

                case STATE_DECAY:
                  this._value += (sus - this._value) * decRatio;
                  if (
                    this._value <= sus ||
                    Math.abs(this._value - sus) <= TARGET_EPSILON
                  ) {
                    this._value = sus;
                    this._state = STATE_SUSTAIN;
                  }
                  break;

                case STATE_SUSTAIN:
                  this._value = sus;
                  break;

                case STATE_RELEASE:
                  this._value += -this._value * relRatio;
                  if (this._value <= TARGET_EPSILON) {
                    this._value = 0;
                    this._state = STATE_IDLE;
                  }
                  break;

                case STATE_IDLE:
                default:
                  this._value = 0;
                  this._state = STATE_IDLE;
                  break;
              }

              this._value = Math.min(1, Math.max(0, this._value));

              for (const channel of output) {
                channel[i] = this._value;
              }

              this._lasttrig = this._trig;
              this._lastReset = this._reset;
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
