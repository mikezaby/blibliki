import type { IEngineSerialize } from "@blibliki/engine";
import type { SerializableRuntimeModule } from "./instrumentRuntimeModules";

export function toEngineSerializableModule(
  module: SerializableRuntimeModule,
): IEngineSerialize["modules"][number] {
  if (module.voices !== undefined) {
    return {
      ...module,
      voices: module.voices,
      inputs: [],
      outputs: [],
    };
  }

  return {
    ...module,
    voiceNo: 0,
    inputs: [],
    outputs: [],
  };
}
