import { type MidiEvent, ModuleType, TransportState } from "@blibliki/engine";
import type {
  CompiledInstrumentEnginePatch,
  InstrumentDisplayNotice,
  InstrumentDisplayState,
} from "@blibliki/instrument";
import {
  createInstrumentDisplayState,
  createInstrumentRuntimeState,
} from "@/instrumentRuntime";
import { createSeqEditDisplayState } from "@/sequencerEdit";

type DisplayEngineModule = {
  moduleType?: ModuleType;
  props?: Record<string, unknown>;
  state?: Record<string, unknown>;
  onMidiEvent?: (event: MidiEvent) => unknown;
};

export type LiveDisplayEngine = {
  state?: TransportState;
  findModule: (id: string) => DisplayEngineModule;
};

function formatSlotValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "ON" : "OFF";
  }

  if (typeof value === "number") {
    return `${value}`;
  }

  if (typeof value === "string") {
    return value;
  }

  return "--";
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function getModuleProp(
  engine: LiveDisplayEngine,
  moduleId: string,
  propKey: string,
): unknown {
  try {
    return engine.findModule(moduleId).props?.[propKey];
  } catch {
    return undefined;
  }
}

function resolveGlobalSlotValue(
  slot: InstrumentDisplayState["globalBand"]["slots"][number],
  engine: LiveDisplayEngine,
  runtimePatch: CompiledInstrumentEnginePatch,
) {
  switch (slot.key) {
    case "tempo": {
      const value = getModuleProp(
        engine,
        runtimePatch.runtime.transportControlId,
        "bpm",
      );
      return {
        rawValue: typeof value === "number" ? value : slot.rawValue,
        valueText: typeof value === "number" ? `${value} BPM` : slot.valueText,
      };
    }
    case "swing": {
      const value = getModuleProp(
        engine,
        runtimePatch.runtime.transportControlId,
        "swing",
      );
      return {
        rawValue: typeof value === "number" ? value : slot.rawValue,
        valueText:
          typeof value === "number" ? formatPercent(value) : slot.valueText,
      };
    }
    case "masterFilterCutoff": {
      const value = getModuleProp(
        engine,
        runtimePatch.runtime.masterFilterId,
        "cutoff",
      );
      return {
        rawValue: typeof value === "number" ? value : slot.rawValue,
        valueText: typeof value === "number" ? `${value}` : slot.valueText,
      };
    }
    case "masterFilterResonance": {
      const value = getModuleProp(
        engine,
        runtimePatch.runtime.masterFilterId,
        "Q",
      );
      return {
        rawValue: typeof value === "number" ? value : slot.rawValue,
        valueText: typeof value === "number" ? `${value}` : slot.valueText,
      };
    }
    case "reverbSend": {
      const value = getModuleProp(
        engine,
        runtimePatch.runtime.globalReverbId,
        "mix",
      );
      return {
        rawValue: typeof value === "number" ? value : slot.rawValue,
        valueText:
          typeof value === "number" ? formatPercent(value) : slot.valueText,
      };
    }
    case "delaySend": {
      const value = getModuleProp(
        engine,
        runtimePatch.runtime.globalDelayId,
        "mix",
      );
      return {
        rawValue: typeof value === "number" ? value : slot.rawValue,
        valueText:
          typeof value === "number" ? formatPercent(value) : slot.valueText,
      };
    }
    case "masterVolume": {
      const value = getModuleProp(
        engine,
        runtimePatch.runtime.masterVolumeId,
        "gain",
      );
      return {
        rawValue: typeof value === "number" ? value : slot.rawValue,
        valueText:
          typeof value === "number" ? formatPercent(value) : slot.valueText,
      };
    }
    case "inactive": {
      return {
        rawValue: slot.rawValue,
        valueText: slot.valueText,
      };
    }
    default:
      return {
        rawValue: slot.rawValue,
        valueText: slot.valueText,
      };
  }
}

function resolveSlotValueFromRuntimePatch(
  runtimePatch: CompiledInstrumentEnginePatch,
  band: InstrumentDisplayState["upperBand"],
  engine: LiveDisplayEngine,
): typeof band {
  const runtimeState = createInstrumentRuntimeState(runtimePatch);
  const region =
    runtimeState.visiblePage.regions.find(
      (candidate) => candidate.position === band.position,
    ) ?? runtimeState.visiblePage.regions[0];

  return {
    ...band,
    slots: band.slots.map((slot, index) => {
      if (slot.kind === "empty") {
        return slot;
      }

      const compiledSlot = region.slots[index];
      if (!compiledSlot || compiledSlot.kind === "empty") {
        return slot;
      }

      const liveValue = getModuleProp(
        engine,
        compiledSlot.binding.moduleId,
        compiledSlot.binding.propKey,
      );

      return {
        ...slot,
        rawValue:
          liveValue === undefined
            ? slot.rawValue
            : (liveValue as typeof slot.rawValue),
        valueText:
          liveValue === undefined ? slot.valueText : formatSlotValue(liveValue),
      };
    }) as typeof band.slots,
  };
}

export function createLiveInstrumentDisplayState(
  engine: LiveDisplayEngine,
  runtimePatch: CompiledInstrumentEnginePatch,
  options: {
    notice?: InstrumentDisplayNotice;
  } = {},
): InstrumentDisplayState {
  const runtimeState = createInstrumentRuntimeState(runtimePatch);
  if (runtimeState.navigation.mode === "seqEdit") {
    const seqEditDisplayState = createSeqEditDisplayState(runtimePatch);
    if (seqEditDisplayState) {
      return {
        ...seqEditDisplayState,
        notice: options.notice,
        header: {
          ...seqEditDisplayState.header,
          transportState: engine.state ?? TransportState.stopped,
        },
      };
    }
  }

  const staticDisplayState = createInstrumentDisplayState(runtimeState);

  return {
    ...staticDisplayState,
    notice: options.notice,
    header: {
      ...staticDisplayState.header,
      transportState: engine.state ?? TransportState.stopped,
    },
    globalBand: {
      slots: staticDisplayState.globalBand.slots.map((slot) => ({
        ...slot,
        ...resolveGlobalSlotValue(slot, engine, runtimePatch),
      })) as InstrumentDisplayState["globalBand"]["slots"],
    },
    upperBand: resolveSlotValueFromRuntimePatch(
      runtimePatch,
      staticDisplayState.upperBand,
      engine,
    ),
    lowerBand: resolveSlotValueFromRuntimePatch(
      runtimePatch,
      staticDisplayState.lowerBand,
      engine,
    ),
  };
}
