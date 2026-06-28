export const recorderProcessorURL = URL.createObjectURL(
  new Blob(
    [
      "(",
      (() => {
        type RecorderMessage = {
          type?: unknown;
          at?: unknown;
        };

        // Flush captured audio to the main thread roughly every ~0.18s (at 44.1k)
        // to avoid ~375 postMessages/sec and keep the worklet's own memory low.
        const FLUSH_FRAMES = 8192;

        const concat = (
          chunks: Float32Array[],
          length: number,
        ): Float32Array => {
          const out = new Float32Array(length);
          let offset = 0;
          for (const chunk of chunks) {
            out.set(chunk, offset);
            offset += chunk.length;
          }
          return out;
        };

        class RecorderProcessor extends AudioWorkletProcessor {
          private startFrame: number | null = null;
          private stopFrame: number | null = null;
          private recording = false;
          private channelCount = 0;
          private buffers: Float32Array[][] = [];
          private pendingFrames = 0;

          constructor() {
            super();

            this.port.onmessage = (event: MessageEvent<unknown>) => {
              const data = event.data;
              if (!data || typeof data !== "object") return;
              const message = data as RecorderMessage;

              switch (message.type) {
                case "start":
                  this.startFrame = Math.round(Number(message.at) * sampleRate);
                  this.stopFrame = null;
                  this.recording = false;
                  this.channelCount = 0;
                  this.buffers = [];
                  this.pendingFrames = 0;
                  break;
                case "stop":
                  this.stopFrame = Math.round(Number(message.at) * sampleRate);
                  break;
                case "cancel":
                  this.reset();
                  break;
              }
            };
          }

          private reset() {
            this.startFrame = null;
            this.stopFrame = null;
            this.recording = false;
            this.channelCount = 0;
            this.buffers = [];
            this.pendingFrames = 0;
          }

          private flush(done: boolean) {
            if (this.pendingFrames > 0) {
              const length = this.pendingFrames;
              const channels = this.buffers.map((chunks) =>
                concat(chunks, length),
              );
              this.port.postMessage(
                { type: "chunk", channels },
                channels.map((c) => c.buffer),
              );
              this.buffers = this.buffers.map(() => []);
              this.pendingFrames = 0;
            }

            if (done) {
              this.port.postMessage({ type: "done", sampleRate });
              this.reset();
            }
          }

          process(inputs: Float32Array[][], outputs: Float32Array[][]) {
            const input = inputs[0];
            const output = outputs[0];

            // Passthrough so the recorder can sit inline / be monitored.
            if (input && output) {
              for (let ch = 0; ch < output.length; ch++) {
                const src = input[ch] ?? input[0];
                const dst = output[ch];
                if (src && dst) dst.set(src);
              }
            }

            if (this.startFrame === null) return true;

            const blockStart = currentFrame;
            const blockLen = input?.[0] ? input[0].length : 128;

            // Still before the precise start sample.
            if (blockStart + blockLen <= this.startFrame) return true;

            const localStart = Math.max(0, this.startFrame - blockStart);
            let localEnd = blockLen;
            let finished = false;
            if (
              this.stopFrame !== null &&
              this.stopFrame <= blockStart + blockLen
            ) {
              localEnd = Math.max(localStart, this.stopFrame - blockStart);
              finished = true;
            }

            if (!this.recording) {
              this.recording = true;
              this.channelCount = Math.max(1, input ? input.length : 1);
              this.buffers = Array.from(
                { length: this.channelCount },
                () => [],
              );
            }

            if (input && localEnd > localStart) {
              for (let ch = 0; ch < this.channelCount; ch++) {
                const src = input[ch] ?? input[0];
                if (src)
                  this.buffers[ch]!.push(src.slice(localStart, localEnd));
              }
              this.pendingFrames += localEnd - localStart;
            }

            if (finished || this.pendingFrames >= FLUSH_FRAMES) {
              this.flush(finished);
            }

            return true;
          }
        }

        registerProcessor("recorder-processor", RecorderProcessor);
      }).toString(),
      ")()",
    ],
    { type: "application/javascript" },
  ),
);
