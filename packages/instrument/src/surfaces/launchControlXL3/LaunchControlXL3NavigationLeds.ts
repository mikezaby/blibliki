import { MidiEvent, ModuleType } from "@blibliki/engine";
import type { CompiledInstrumentEnginePatch } from "@/compiler/instrumentTypes";
import type { LiveDisplayEngine } from "@/display/LiveInstrumentDisplayState";

const NAVIGATION_LED_CCS = [102, 103, 106, 107] as const;
const NAVIGATION_LED_ON = 127;

export function syncLaunchControlXL3NavigationButtonLeds(
  engine: LiveDisplayEngine,
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  const controllerOutputId = runtimePatch.runtime.controllerOutputId;
  if (!controllerOutputId) {
    return;
  }

  const controllerOutput = engine.findModule(controllerOutputId);
  if (
    controllerOutput.moduleType !== ModuleType.MidiOutput ||
    typeof controllerOutput.onMidiEvent !== "function"
  ) {
    return;
  }

  NAVIGATION_LED_CCS.forEach((cc) => {
    controllerOutput.onMidiEvent?.(MidiEvent.fromCC(cc, NAVIGATION_LED_ON, 0));
  });
}
