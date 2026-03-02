export const wavetableProcessorURL = URL.createObjectURL(
  new Blob(
    [
      "(",
      (() => {
        type WavetableTable = {
          real: number[];
          imag: number[];
        };

        type WavetableProcessorMessage = {
          type?: unknown;
          tables?: unknown;
        };

        const MIN_COEFFICIENT_LENGTH = 2;
        const MAX_HARMONICS = 128;
        const FRAME_SIZE = 2048;
        const POSITION_SMOOTHING_TIME_SECONDS = 0.06;
        const POSITION_REPORT_EPSILON = 0.001;
        const POSITION_REPORT_INTERVAL_SECONDS = 1 / 30;
        const SET_TABLES_MESSAGE = "setTables";
        const ACTUAL_POSITION_MESSAGE = "actualPosition";
        const DEFAULT_TABLES = [
          { real: [0, 0], imag: [0, 0] },
          { real: [0, 0], imag: [0, 1] },
        ];

        const clamp = (value: number, min: number, max: number): number => {
          return Math.min(max, Math.max(min, value));
        };

        const sanitizeCoefficients = (values: unknown): number[] => {
          if (!Array.isArray(values)) return [0, 0];

          const sanitized = values
            .map((value) => (Number.isFinite(value) ? Number(value) : 0))
            .slice(0, MAX_HARMONICS);

          if (sanitized.length >= MIN_COEFFICIENT_LENGTH) {
            return sanitized;
          }

          const padding = Array.from(
            { length: MIN_COEFFICIENT_LENGTH - sanitized.length },
            () => 0,
          );

          return [...sanitized, ...padding];
        };

        const sanitizeTable = (table: unknown): WavetableTable => {
          if (!table || typeof table !== "object") {
            return {
              real: [0, 0],
              imag: [0, 0],
            };
          }

          const tableRecord = table as {
            real?: unknown;
            imag?: unknown;
          };
          const real = sanitizeCoefficients(tableRecord.real);
          const imag = sanitizeCoefficients(tableRecord.imag);
          const length = Math.max(real.length, imag.length);

          const pad = (values: number[]): number[] => {
            if (values.length === length) return values;

            return [
              ...values,
              ...Array.from({ length: length - values.length }, () => 0),
            ];
          };

          return {
            real: pad(real),
            imag: pad(imag),
          };
        };

        const sanitizeTables = (tables: unknown): WavetableTable[] => {
          if (!Array.isArray(tables) || tables.length === 0) {
            return DEFAULT_TABLES.map((table) => sanitizeTable(table));
          }

          return tables.map((table) => sanitizeTable(table));
        };

        class WavetableProcessor extends AudioWorkletProcessor {
          phase = 0;
          smoothedPosition = 0;
          lastReportedPosition = 0;
          samplesSinceReport = 0;
          positionInitialized = false;
          tableFrames: Float32Array[] = [];
          positionSmoothingAlpha =
            1 -
            Math.exp(
              -1 / Math.max(1, sampleRate * POSITION_SMOOTHING_TIME_SECONDS),
            );
          reportIntervalSamples = Math.max(
            1,
            Math.floor(sampleRate * POSITION_REPORT_INTERVAL_SECONDS),
          );

          constructor() {
            super();

            this.setTables(DEFAULT_TABLES);

            this.port.onmessage = (event: MessageEvent<unknown>) => {
              const data = event.data;
              if (!data || typeof data !== "object") return;

              const message = data as WavetableProcessorMessage;
              if (message.type === SET_TABLES_MESSAGE) {
                this.setTables(message.tables);
              }
            };
          }

          static get parameterDescriptors() {
            return [
              {
                name: "frequency",
                defaultValue: 440,
                minValue: 0,
                maxValue: 25000,
              },
              {
                name: "detune",
                defaultValue: 0,
                minValue: -4800,
                maxValue: 4800,
              },
              {
                name: "position",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
              },
              {
                name: "active",
                defaultValue: 0,
                minValue: 0,
                maxValue: 1,
              },
            ];
          }

          process(
            _inputs: Float32Array[][],
            outputs: Float32Array[][],
            parameters: Record<string, Float32Array>,
          ): boolean {
            const output = outputs[0];
            if (!output || output.length === 0) return true;

            const frequencyValues = parameters.frequency;
            const detuneValues = parameters.detune;
            const positionValues = parameters.position;
            const activeValues = parameters.active;

            if (
              !frequencyValues ||
              !detuneValues ||
              !positionValues ||
              !activeValues
            ) {
              return true;
            }

            const firstOutputChannel = output[0];
            if (!firstOutputChannel) return true;

            const blockSize = firstOutputChannel.length;
            let hasActiveSample = false;

            for (let i = 0; i < blockSize; i += 1) {
              const active =
                activeValues.length > 1
                  ? (activeValues[i] ?? activeValues[0] ?? 0)
                  : (activeValues[0] ?? 0);
              if (active <= 0.5) {
                this.positionInitialized = false;
                for (const channel of output) {
                  channel[i] = 0;
                }
                continue;
              }

              hasActiveSample = true;

              const frequency =
                frequencyValues.length > 1
                  ? (frequencyValues[i] ?? frequencyValues[0] ?? 440)
                  : (frequencyValues[0] ?? 440);
              const detuneCents =
                detuneValues.length > 1
                  ? (detuneValues[i] ?? detuneValues[0] ?? 0)
                  : (detuneValues[0] ?? 0);
              const targetPosition = clamp(
                positionValues.length > 1
                  ? (positionValues[i] ?? positionValues[0] ?? 0)
                  : (positionValues[0] ?? 0),
                0,
                1,
              );

              if (!this.positionInitialized) {
                this.smoothedPosition = targetPosition;
                this.lastReportedPosition = targetPosition;
                this.positionInitialized = true;
              } else {
                this.smoothedPosition +=
                  (targetPosition - this.smoothedPosition) *
                  this.positionSmoothingAlpha;
              }

              const sample = this.sampleWavetable(
                this.phase,
                this.smoothedPosition,
              );

              for (const channel of output) {
                channel[i] = sample;
              }

              const transposedFrequency = Math.max(
                0,
                frequency * Math.pow(2, detuneCents / 1200),
              );
              this.phase += transposedFrequency / sampleRate;
              if (this.phase >= 1 || this.phase < 0) {
                this.phase -= Math.floor(this.phase);
              }
            }

            if (!hasActiveSample) {
              this.samplesSinceReport = 0;
              return true;
            }

            this.samplesSinceReport += blockSize;
            if (
              Math.abs(this.smoothedPosition - this.lastReportedPosition) >
                POSITION_REPORT_EPSILON ||
              this.samplesSinceReport >= this.reportIntervalSamples
            ) {
              this.lastReportedPosition = this.smoothedPosition;
              this.samplesSinceReport = 0;
              this.port.postMessage({
                type: ACTUAL_POSITION_MESSAGE,
                value: this.smoothedPosition,
              });
            }

            return true;
          }

          setTables(tables: unknown): void {
            const normalized = sanitizeTables(tables);
            this.tableFrames = normalized.map((table: WavetableTable) =>
              this.renderFrame(table.real, table.imag),
            );
          }

          renderFrame(real: number[], imag: number[]): Float32Array {
            const frame = new Float32Array(FRAME_SIZE);
            const harmonics = Math.max(real.length, imag.length);
            let peak = 0;

            for (let sampleIndex = 0; sampleIndex < FRAME_SIZE; sampleIndex++) {
              const phase = (sampleIndex / FRAME_SIZE) * Math.PI * 2;
              let sample = 0;

              for (let harmonic = 1; harmonic < harmonics; harmonic++) {
                sample +=
                  (real[harmonic] ?? 0) * Math.cos(harmonic * phase) +
                  (imag[harmonic] ?? 0) * Math.sin(harmonic * phase);
              }

              frame[sampleIndex] = sample;
              peak = Math.max(peak, Math.abs(sample));
            }

            if (peak > 0) {
              for (let i = 0; i < frame.length; i += 1) {
                const sample = frame[i];
                if (sample === undefined) continue;
                frame[i] = sample / peak;
              }
            }

            return frame;
          }

          sampleWavetable(phase: number, position: number): number {
            if (!this.tableFrames.length) return 0;

            if (this.tableFrames.length === 1) {
              return this.sampleFrame(this.tableFrames[0]!, phase);
            }

            const mapped =
              clamp(position, 0, 1) * (this.tableFrames.length - 1);
            const fromIndex = Math.floor(mapped);
            const toIndex = Math.min(
              fromIndex + 1,
              this.tableFrames.length - 1,
            );
            const mix = mapped - fromIndex;

            const fromSample = this.sampleFrame(
              this.tableFrames[fromIndex]!,
              phase,
            );
            const toSample = this.sampleFrame(
              this.tableFrames[toIndex]!,
              phase,
            );

            return fromSample + (toSample - fromSample) * mix;
          }

          sampleFrame(frame: Float32Array, phase: number): number {
            const safePhase = phase - Math.floor(phase);
            const index = safePhase * FRAME_SIZE;
            const baseIndex = Math.floor(index);
            const nextIndex = (baseIndex + 1) % FRAME_SIZE;
            const t = index - baseIndex;

            const from = frame[baseIndex] ?? 0;
            const to = frame[nextIndex] ?? 0;
            return from + (to - from) * t;
          }
        }

        registerProcessor("wavetable-processor", WavetableProcessor);
      }).toString(),
      ")()",
    ],
    { type: "application/javascript" },
  ),
);
