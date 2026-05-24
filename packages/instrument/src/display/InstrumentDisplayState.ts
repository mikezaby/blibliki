import { ModuleType, TransportState } from "@blibliki/engine";
import { getValueSpecForModuleProp } from "@/blocks/helpers";
import type { InstrumentRuntimeMode } from "@/compiler/instrumentTypes";
import type { CompiledLaunchControlXL3Page } from "@/compiler/types";
import type { InstrumentGlobalBlock } from "@/document/types";
import { launchControlXL3GlobalRow } from "@/hardware/launchControlXL3/globalRow";
import type { PageRegionPosition } from "@/pages/Page";
import type { SlotInitialValue } from "@/slots/BaseSlot";
import type { Fixed8, TrackPageKey } from "@/types";
import type { ValueSpec } from "@/types";

export type DisplaySlotState =
  | {
      kind: "empty";
      valueText: "--";
    }
  | {
      kind: "slot";
      blockKey: string;
      slotKey: string;
      label: string;
      shortLabel: string;
      cc: number;
      inactive?: boolean;
      valueText: string;
      rawValue?: SlotInitialValue;
      valueSpec: ValueSpec;
    };

export type DisplayBandState = {
  position: PageRegionPosition;
  title: string;
  slots: Fixed8<DisplaySlotState>;
};

export type GlobalDisplaySlotState = {
  key: string;
  label: string;
  shortLabel: string;
  cc: number;
  inactive?: boolean;
  valueText: string;
  rawValue?: SlotInitialValue;
  valueSpec?: ValueSpec;
};

export type InstrumentDisplayNotice = {
  title: string;
  message?: string;
  tone?: "info" | "success" | "warning" | "error";
};

export type InstrumentDisplayState = {
  header: {
    instrumentName: string;
    trackName: string;
    pageKey: TrackPageKey;
    controllerPage: 1 | 2 | 3;
    midiChannel: number;
    transportState: TransportState;
    mode: InstrumentRuntimeMode;
  };
  notice?: InstrumentDisplayNotice;
  globalBand: {
    slots: Fixed8<GlobalDisplaySlotState>;
  };
  upperBand: DisplayBandState;
  lowerBand: DisplayBandState;
};

export type CreateInstrumentDisplayStateInput = {
  instrumentName: string;
  trackName: string;
  pageKey: TrackPageKey;
  controllerPage: 1 | 2 | 3;
  midiChannel: number;
  transportState?: TransportState;
  mode?: InstrumentRuntimeMode;
  globalBlock: InstrumentGlobalBlock;
  visiblePage: CompiledLaunchControlXL3Page;
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

function formatGlobalValue(
  globalBlock: InstrumentGlobalBlock,
  key: (typeof launchControlXL3GlobalRow)[number]["key"],
) {
  switch (key) {
    case "tempo":
      return `${globalBlock.tempo} BPM`;
    case "swing":
      return formatPercent(globalBlock.swing);
    case "masterFilterCutoff":
      return `${globalBlock.masterFilterCutoff}`;
    case "masterFilterResonance":
      return `${globalBlock.masterFilterResonance}`;
    case "reverbSend":
      return formatPercent(globalBlock.reverbSend);
    case "delaySend":
      return formatPercent(globalBlock.delaySend);
    case "masterVolume":
      return formatPercent(globalBlock.masterVolume);
    case "inactive":
      return "--";
    default:
      key satisfies never;
      return "--";
  }
}

function getGlobalRawValue(
  globalBlock: InstrumentGlobalBlock,
  key: (typeof launchControlXL3GlobalRow)[number]["key"],
) {
  switch (key) {
    case "tempo":
      return globalBlock.tempo;
    case "swing":
      return globalBlock.swing;
    case "masterFilterCutoff":
      return globalBlock.masterFilterCutoff;
    case "masterFilterResonance":
      return globalBlock.masterFilterResonance;
    case "reverbSend":
      return globalBlock.reverbSend;
    case "delaySend":
      return globalBlock.delaySend;
    case "masterVolume":
      return globalBlock.masterVolume;
    case "inactive":
      return undefined;
    default:
      key satisfies never;
      return undefined;
  }
}

function getGlobalValueSpec(
  key: (typeof launchControlXL3GlobalRow)[number]["key"],
): ValueSpec | undefined {
  switch (key) {
    case "tempo":
      return getValueSpecForModuleProp(ModuleType.TransportControl, "bpm");
    case "swing":
      return getValueSpecForModuleProp(ModuleType.TransportControl, "swing");
    case "masterFilterCutoff":
      return getValueSpecForModuleProp(ModuleType.Filter, "cutoff");
    case "masterFilterResonance":
      return getValueSpecForModuleProp(ModuleType.Filter, "Q");
    case "reverbSend":
      return getValueSpecForModuleProp(ModuleType.Reverb, "mix");
    case "delaySend":
      return getValueSpecForModuleProp(ModuleType.Delay, "mix");
    case "masterVolume":
      return getValueSpecForModuleProp(ModuleType.Gain, "gain");
    case "inactive":
      return undefined;
    default:
      key satisfies never;
      return undefined;
  }
}

function createGlobalBandState(globalBlock: InstrumentGlobalBlock) {
  return {
    slots: launchControlXL3GlobalRow.map((control) => ({
      key: control.key,
      label: control.label,
      shortLabel: control.shortLabel,
      cc: control.cc,
      inactive: control.inactive,
      valueText: formatGlobalValue(globalBlock, control.key),
      rawValue: getGlobalRawValue(globalBlock, control.key),
      valueSpec: getGlobalValueSpec(control.key),
    })) as Fixed8<GlobalDisplaySlotState>,
  };
}

function formatBandTitle(
  region: CompiledLaunchControlXL3Page["regions"][number],
) {
  const firstSlot = region.slots.find((slot) => slot.kind === "slot");
  if (!firstSlot) {
    return region.position.toUpperCase();
  }

  return firstSlot.blockKey.toUpperCase();
}

function createBandState(
  region: CompiledLaunchControlXL3Page["regions"][number],
): DisplayBandState {
  return {
    position: region.position,
    title: formatBandTitle(region),
    slots: region.slots.map((slot) => {
      if (slot.kind === "empty") {
        return {
          kind: "empty",
          valueText: "--",
        };
      }

      return {
        kind: "slot",
        blockKey: slot.blockKey,
        slotKey: slot.slotKey,
        label: slot.label,
        shortLabel: slot.shortLabel,
        cc: slot.cc,
        inactive: slot.inactive,
        valueText: formatSlotValue(slot.initialValue),
        rawValue: slot.initialValue,
        valueSpec: slot.valueSpec,
      };
    }) as Fixed8<DisplaySlotState>,
  };
}

export function createInstrumentDisplayState({
  instrumentName,
  trackName,
  pageKey,
  controllerPage,
  midiChannel,
  transportState = TransportState.stopped,
  mode = "performance",
  globalBlock,
  visiblePage,
}: CreateInstrumentDisplayStateInput): InstrumentDisplayState {
  const [upperRegion, lowerRegion] = visiblePage.regions;

  return {
    header: {
      instrumentName,
      trackName,
      pageKey,
      controllerPage,
      midiChannel,
      transportState,
      mode,
    },
    globalBand: createGlobalBandState(globalBlock),
    upperBand: createBandState(upperRegion),
    lowerBand: createBandState(lowerRegion),
  };
}
