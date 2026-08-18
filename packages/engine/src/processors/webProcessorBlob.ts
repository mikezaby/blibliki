import type { NativeWorkletDefinition } from "@blibliki/utils";

// Turns a processor definition into a Blob-URL AudioWorklet module by embedding
// the definition's top-level `process` (+ createState, onMessage) source and
// adapting web's AudioWorklet runtime (3D inputs/outputs, MessagePort, global
// sampleRate/currentFrame) to the neutral shape the definition expects. Same
// source runs natively via react-native-worklets — no web/native duplication.
export function createProcessorBlobURL(
  definition: NativeWorkletDefinition,
): string {
  const createState = definition.createState?.toString() ?? "() => ({})";
  const onMessage = definition.onMessage?.toString() ?? "null";
  const source = `
    (() => {
      const __process = ${definition.process!.toString()};
      const __createState = ${createState};
      const __onMessage = ${onMessage};
      const __descriptors = ${JSON.stringify(definition.parameterDescriptors)};
      class Processor extends AudioWorkletProcessor {
        constructor() {
          super();
          const self = this;
          this.__state = __createState();
          this.__post = (message, transfer) =>
            self.port.postMessage(message, transfer);
          if (__onMessage) {
            this.port.onmessage = (event) => {
              __onMessage(event.data, self.__state);
            };
          }
        }
        static get parameterDescriptors() {
          return __descriptors;
        }
        process(inputs, outputs, parameters) {
          const inputChannels = inputs[0] ?? [];
          const outputChannels = outputs[0] ?? [];
          const frames =
            (outputChannels[0] ?? inputChannels[0])?.length ?? 128;
          __process(inputChannels, outputChannels, frames, parameters, this.__state, {
            sampleRate: sampleRate,
            currentFrame: currentFrame,
            post: this.__post,
          });
          return true;
        }
      }
      registerProcessor(${JSON.stringify(definition.name)}, Processor);
    })();
  `;

  return URL.createObjectURL(
    new Blob([source], { type: "application/javascript" }),
  );
}
