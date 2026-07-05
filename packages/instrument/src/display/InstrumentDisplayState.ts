import { TransportState } from "@blibliki/engine";
import type { InstrumentRuntimeMode } from "@/compiler/instrumentTypes";
import type { CompiledLaunchControlXL3Page } from "@/compiler/types";
import type { InstrumentGlobalBlock } from "@/document/types";
import {
  getGlobalControlValueSpec,
  launchControlXL3GlobalRow,
} from "@/hardware/launchControlXL3/globalRow";
import type { MacroControllerScope, MacroEncoder } from "@/macros/types";
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

export type BandSection = {
  label: string;
  startIndex: number;
};

export type DisplayBandState = {
  position: PageRegionPosition;
  title: string;
  sections: BandSection[];
  slots: Fixed8<DisplaySlotState>;
};

export type GlobalDisplaySlotState = {
  key: string;
  slotId?: string;
  macroId?: string;
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
    trackVolume?: number;
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
  globalController: MacroControllerScope;
  visiblePage: CompiledLaunchControlXL3Page;
};

function formatSlotValue(value: unknown): string {
  if (typeof value === "boolean") {
    return value ? "ON" : "OFF";
  }

  if (typeof value === "number") {
    return formatNum(value);
  }

  if (typeof value === "string") {
    return value;
  }

  return "--";
}

function formatNum(value: number) {
  return parseFloat(value.toFixed(2)).toString();
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatVolume(value: number) {
  return `${value} dB`;
}

function formatMacroValue(macro: MacroEncoder) {
  // macro.value is already native to the polarity: unipolar 0..1, bipolar
  // -1..1 (0 = centre). So the percentage is a direct scale for both.
  return formatPercent(macro.value);
}

function formatGlobalValue(
  globalBlock: InstrumentGlobalBlock,
  key: (typeof launchControlXL3GlobalRow)[number]["key"],
) {
  switch (key) {
    case null:
      return "--";
    case "tempo":
      return `${globalBlock.tempo} BPM`;
    case "swing":
      return formatPercent(globalBlock.swing);
    case "masterVolume":
      return formatVolume(globalBlock.masterVolume);
    case "probabilityAmount":
      return formatPercent(globalBlock.probabilityAmount);
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
    case null:
      return undefined;
    case "tempo":
      return globalBlock.tempo;
    case "swing":
      return globalBlock.swing;
    case "masterVolume":
      return globalBlock.masterVolume;
    case "probabilityAmount":
      return globalBlock.probabilityAmount;
    default:
      key satisfies never;
      return undefined;
  }
}

function findMacroForGlobalControl(
  globalController: MacroControllerScope,
  control: (typeof launchControlXL3GlobalRow)[number],
) {
  if (!control.slotId) {
    return undefined;
  }

  const assignment = globalController.encoderSlots[control.slotId];
  if (assignment?.type !== "macro") {
    return undefined;
  }

  return globalController.macros.find(
    (macro) => macro.id === assignment.macroId,
  );
}

function createGlobalBandState(
  globalBlock: InstrumentGlobalBlock,
  globalController: MacroControllerScope,
) {
  return {
    slots: launchControlXL3GlobalRow.map((control) => {
      const macro = findMacroForGlobalControl(globalController, control);
      if (macro) {
        return {
          key: macro.id,
          slotId: control.slotId,
          macroId: macro.id,
          label: macro.name,
          shortLabel: macro.name,
          cc: control.cc,
          inactive: !macro.enabled,
          valueText: formatMacroValue(macro),
          rawValue: macro.value,
          valueSpec: {
            kind: "number",
            // Match the macro's native range so bipolar knobs render a
            // centre-anchored fill (edit mode already uses -1..1).
            min: macro.polarity === "bipolar" ? -1 : 0,
            max: 1,
            step: 0.01,
          },
        };
      }

      return {
        key: control.key ?? "",
        slotId: control.slotId,
        label: control.label,
        shortLabel: control.shortLabel,
        cc: control.cc,
        valueText: formatGlobalValue(globalBlock, control.key),
        rawValue: getGlobalRawValue(globalBlock, control.key),
        valueSpec: control.key
          ? getGlobalControlValueSpec(control.key)
          : undefined,
      };
    }) as Fixed8<GlobalDisplaySlotState>,
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function computeBandSections(
  region: CompiledLaunchControlXL3Page["regions"][number],
): BandSection[] {
  const sections: BandSection[] = [];
  let currentKey: string | null = null;

  region.slots.forEach((slot, i) => {
    if (slot.kind !== "slot" || slot.blockKey === currentKey) return;
    currentKey = slot.blockKey;
    sections.push({ label: capitalize(slot.blockType), startIndex: i });
  });

  return sections.length > 0
    ? sections
    : [{ label: region.position.toUpperCase(), startIndex: 0 }];
}

function createBandState(
  region: CompiledLaunchControlXL3Page["regions"][number],
): DisplayBandState {
  const sections = computeBandSections(region);
  const firstSlot = region.slots.find((s) => s.kind === "slot");
  const title = firstSlot
    ? firstSlot.blockKey.toUpperCase()
    : region.position.toUpperCase();

  return {
    position: region.position,
    title,
    sections,
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
  globalController,
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
    globalBand: createGlobalBandState(globalBlock, globalController),
    upperBand: createBandState(upperRegion),
    lowerBand: createBandState(lowerRegion),
  };
}
