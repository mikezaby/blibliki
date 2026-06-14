import {
  type IMidiMapperProps,
  type IUpdateModule,
  ModuleType,
} from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";

export function getSelectedMidiName(
  runtimePatch: CompiledInstrumentEnginePatch,
  moduleId: string | undefined,
) {
  if (!moduleId) {
    return;
  }

  const module = runtimePatch.patch.modules.find(
    (candidate) => candidate.id === moduleId,
  );
  if (module?.moduleType !== ModuleType.MidiInput) {
    return;
  }

  const props = module.props as { selectedName?: unknown };
  return typeof props.selectedName === "string"
    ? props.selectedName
    : undefined;
}

function getMidiMapperProps(runtimePatch: CompiledInstrumentEnginePatch) {
  const midiMapper = runtimePatch.patch.modules.find(
    (module) => module.id === runtimePatch.runtime.midiMapperId,
  );
  if (midiMapper?.moduleType !== ModuleType.MidiMapper) {
    throw new Error(
      "Instrument runtime patch is missing the midi mapper module",
    );
  }

  return midiMapper.props as IMidiMapperProps;
}

export function createMidiMapperUpdate(
  runtimePatch: CompiledInstrumentEnginePatch,
): IUpdateModule<ModuleType.MidiMapper> {
  return {
    id: runtimePatch.runtime.midiMapperId,
    moduleType: ModuleType.MidiMapper,
    changes: {
      props: getMidiMapperProps(runtimePatch),
    },
  };
}
