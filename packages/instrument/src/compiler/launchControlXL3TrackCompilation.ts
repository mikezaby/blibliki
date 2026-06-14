import {
  type IMidiMapperProps,
  type MidiMapping,
  MidiMappingMode,
  type ModuleType,
} from "@blibliki/engine";
import { launchControlXL3PageMap } from "@/hardware/launchControlXL3/pageMap";
import type { PageRegion } from "@/pages/Page";
import type BaseTrack from "@/tracks/BaseTrack";
import type { Fixed8 } from "@/types";
import type {
  CompiledLaunchControlXL3Page,
  CompiledLaunchControlXL3PageSlot,
  CompiledPage,
  CompiledPageSlot,
} from "./types";

const TOP_ROW_CCS = [21, 22, 23, 24, 25, 26, 27, 28] as const;
const BOTTOM_ROW_CCS = [29, 30, 31, 32, 33, 34, 35, 36] as const;

function getRowCcs(position: PageRegion["position"]) {
  return position === "top" ? TOP_ROW_CCS : BOTTOM_ROW_CCS;
}

function withControllerSlotMeta(
  slot: CompiledPageSlot,
  position: PageRegion["position"],
  controllerColumn: number,
): CompiledLaunchControlXL3PageSlot {
  const cc = getRowCcs(position)[controllerColumn]!;

  if (slot.kind === "empty") {
    return {
      kind: "empty",
      cc,
      controllerRow: position,
      controllerColumn,
    };
  }

  return {
    ...slot,
    cc,
    controllerRow: position,
    controllerColumn,
  };
}

function createMidiMapping(
  track: BaseTrack,
  resolvedSlot: Extract<CompiledLaunchControlXL3PageSlot, { kind: "slot" }>,
): MidiMapping<ModuleType> {
  const block = track.findBlock(resolvedSlot.blockKey);
  const module = block.findModule(resolvedSlot.binding.moduleId);

  return {
    cc: resolvedSlot.cc,
    moduleId: resolvedSlot.binding.moduleId,
    moduleType: module.moduleType,
    propName: resolvedSlot.binding.propKey,
    mode: MidiMappingMode.incDec,
  };
}

export function compileLaunchControlXL3Track(
  track: BaseTrack,
  pages: CompiledPage[],
) {
  const resolvedPages: CompiledLaunchControlXL3Page[] = [];
  const midiMapperTracks: IMidiMapperProps["tracks"] = [];

  launchControlXL3PageMap.forEach(
    ({ controllerPage, pageKey }, midiMapperTrackIndex) => {
      const page = pages.find((candidate) => candidate.key === pageKey);
      if (!page) {
        return;
      }

      const resolvedPage: CompiledLaunchControlXL3Page = {
        controllerPage,
        midiMapperTrackIndex,
        pageKey,
        regions: page.regions.map((region) => ({
          position: region.position,
          slots: region.slots.map((slot, controllerColumn) =>
            withControllerSlotMeta(slot, region.position, controllerColumn),
          ) as Fixed8<CompiledLaunchControlXL3PageSlot>,
        })) as CompiledLaunchControlXL3Page["regions"],
      };

      resolvedPages.push(resolvedPage);

      midiMapperTracks.push({
        name: pageKey,
        mappings: resolvedPage.regions.flatMap((region) =>
          region.slots
            .filter(
              (
                slot,
              ): slot is Extract<
                CompiledLaunchControlXL3PageSlot,
                { kind: "slot" }
              > => slot.kind === "slot",
            )
            .map((slot) => createMidiMapping(track, slot)),
        ),
      });
    },
  );

  return {
    pages: resolvedPages.map(
      ({ controllerPage, midiMapperTrackIndex, pageKey }) => ({
        controllerPage,
        midiMapperTrackIndex,
        pageKey,
      }),
    ),
    resolvedPages,
    midiMapper: {
      tracks: midiMapperTracks,
      activeTrack: 0,
      globalMappings: [],
    },
  };
}
