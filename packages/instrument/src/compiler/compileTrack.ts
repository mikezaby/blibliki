import {
  type IMidiMapperProps,
  type IRoute,
  type MidiMapping,
  MidiMappingMode,
  type ModuleType,
} from "@blibliki/engine";
import type BaseBlock from "@/blocks/BaseBlock";
import type {
  BlockIO,
  BlockPlug,
  BlockRoute,
  BlockModule,
} from "@/blocks/types";
import { launchControlXL3PageMap } from "@/hardware/launchControlXL3/pageMap";
import type { PageRegion, PageSlotRef, SlotRef } from "@/pages/Page";
import type BaseTrack from "@/tracks/BaseTrack";
import type { TrackRoute } from "@/tracks/types";
import type { Fixed8 } from "@/types";
import type {
  CompiledLaunchControlXL3Page,
  CompiledLaunchControlXL3PageSlot,
  CompiledPage,
  CompiledPageSlot,
  CompiledTrack,
} from "./types";

const TOP_ROW_CCS = [21, 22, 23, 24, 25, 26, 27, 28] as const;
const BOTTOM_ROW_CCS = [29, 30, 31, 32, 33, 34, 35, 36] as const;

function cloneModule(module: BlockModule): BlockModule {
  return structuredClone(module);
}

function createCompiledRouteId(
  trackKey: string,
  source: BlockPlug,
  destination: BlockPlug,
) {
  return `${trackKey}:${source.moduleId}.${source.ioName}->${destination.moduleId}.${destination.ioName}`;
}

function compileBlockRoute(trackKey: string, route: BlockRoute): IRoute {
  return {
    id: createCompiledRouteId(trackKey, route.source, route.destination),
    source: route.source,
    destination: route.destination,
  };
}

function compileExpandedTrackRoutes(
  trackKey: string,
  sourceIO: BlockIO,
  destinationIO: BlockIO,
): IRoute[] {
  const routes: IRoute[] = [];

  for (const sourcePlug of sourceIO.plugs) {
    for (const destinationPlug of destinationIO.plugs) {
      routes.push({
        id: createCompiledRouteId(trackKey, sourcePlug, destinationPlug),
        source: sourcePlug,
        destination: destinationPlug,
      });
    }
  }

  return routes;
}

function resolveSlot(block: BaseBlock, slotRef: SlotRef): CompiledPageSlot {
  const slot = block.findSlot(slotRef.slotKey);

  return {
    kind: "slot",
    blockKey: block.key,
    blockType: block.type,
    slotKey: slot.key,
    label: slot.label,
    shortLabel: slot.shortLabel,
    valueSpec: slot.valueSpec,
    binding: slot.binding,
    initialValue: slot.initialValue,
    inactive: slot.inactive,
  };
}

function resolvePageSlot(
  track: BaseTrack,
  slotRef: PageSlotRef,
): CompiledPageSlot {
  if (slotRef.kind === "empty") {
    return {
      kind: "empty",
    };
  }

  const block = track.findBlock(slotRef.blockKey);
  return resolveSlot(block, slotRef);
}

function resolvePageRegion(track: BaseTrack, region: PageRegion) {
  return {
    position: region.position,
    slots: region.slots.map((slotRef) =>
      resolvePageSlot(track, slotRef),
    ) as Fixed8<CompiledPageSlot>,
  };
}

function compilePages(track: BaseTrack): CompiledPage[] {
  return Array.from(track.pages.values()).map((page) => ({
    key: page.key,
    kind: page.kind,
    regions: page.regions.map((region) =>
      resolvePageRegion(track, region),
    ) as CompiledPage["regions"],
  }));
}

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
    mode: MidiMappingMode.direct,
  };
}

function compileLaunchControlXL3(track: BaseTrack, pages: CompiledPage[]) {
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

function compileTrackRoutes(track: BaseTrack): IRoute[] {
  return Array.from(track.routes.values()).flatMap((route: TrackRoute) => {
    const sourceBlock = track.findBlock(route.source.blockKey);
    const destinationBlock = track.findBlock(route.destination.blockKey);
    const sourceIO = sourceBlock.findOutput(route.source.ioName);
    const destinationIO = destinationBlock.findInput(route.destination.ioName);

    return compileExpandedTrackRoutes(track.key, sourceIO, destinationIO);
  });
}

function compileBlockRoutes(track: BaseTrack): IRoute[] {
  return Array.from(track.blocks.values()).flatMap((block) =>
    Array.from(block.routes.values()).map((route) =>
      compileBlockRoute(track.key, route),
    ),
  );
}

function compileModules(track: BaseTrack): BlockModule[] {
  return Array.from(track.blocks.values()).flatMap((block) =>
    Array.from(block.modules.values()).map(cloneModule),
  );
}

export function compileTrack(track: BaseTrack): CompiledTrack {
  const pages = compilePages(track);

  return {
    key: track.key,
    engine: {
      modules: compileModules(track),
      routes: [...compileBlockRoutes(track), ...compileTrackRoutes(track)],
    },
    pages,
    launchControlXL3: compileLaunchControlXL3(track, pages),
  };
}
