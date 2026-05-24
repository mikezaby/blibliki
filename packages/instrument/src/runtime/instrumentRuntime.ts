import { Instrument } from "@/Instrument";
import type {
  CreateInstrumentRuntimeStateOptions,
  InstrumentRuntimeState,
} from "@/Instrument";
import type {
  CompiledInstrumentEnginePatch,
  InstrumentNavigationState,
} from "@/compiler/instrumentTypes";
import type { InstrumentDisplayState } from "@/display/InstrumentDisplayState";

export type { InstrumentNavigationAction } from "@/core/InstrumentNavigation";
export type {
  CreateInstrumentRuntimeStateOptions,
  InstrumentRuntimeState,
} from "@/Instrument";

export function createInstrumentRuntimeState(
  runtimePatch: CompiledInstrumentEnginePatch,
  options: CreateInstrumentRuntimeStateOptions = {},
): InstrumentRuntimeState {
  return Instrument.fromRuntimePatch(runtimePatch, options).runtimeState;
}

export function createInstrumentDisplayState(
  runtimeState: InstrumentRuntimeState,
): InstrumentDisplayState {
  return Instrument.createDisplayState(runtimeState);
}

export function updateInstrumentRuntimeNavigation(
  runtimePatch: CompiledInstrumentEnginePatch,
  navigation: Partial<InstrumentNavigationState>,
): CompiledInstrumentEnginePatch {
  return Instrument.fromRuntimePatch(runtimePatch)
    .withNavigation(navigation)
    .serializeEnginePatch();
}

export function navigateInstrumentRuntime(
  runtimePatch: CompiledInstrumentEnginePatch,
  action: import("@/core/InstrumentNavigation").InstrumentNavigationAction,
): CompiledInstrumentEnginePatch {
  return Instrument.fromRuntimePatch(runtimePatch)
    .navigate(action)
    .serializeEnginePatch();
}
