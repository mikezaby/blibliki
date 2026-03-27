import type { IRoute } from "@blibliki/engine";
import type { BlockIO, BlockPlug, BlockModule } from "@/blocks/types";
import type BaseTrack from "@/tracks/BaseTrack";
import type { TrackIO, TrackPlug } from "@/tracks/types";
import type {
  CompiledLaunchControlXL3Page,
  CompiledPage,
  CompiledPageSlot,
  CompiledTrack,
} from "./types";

export function scopeModuleId(trackKey: string, moduleId: string) {
  return `${trackKey}.${moduleId}`;
}

export function scopeBlockPlug(trackKey: string, plug: BlockPlug): BlockPlug {
  return {
    ...plug,
    moduleId: scopeModuleId(trackKey, plug.moduleId),
  };
}

export function scopeBlockIO(trackKey: string, io: BlockIO): BlockIO {
  return {
    ...io,
    plugs: io.plugs.map((plug) => scopeBlockPlug(trackKey, plug)),
  };
}

function resolveTrackPlug(
  track: BaseTrack,
  plug: TrackPlug,
  direction: "input" | "output",
): BlockPlug[] {
  const block = track.findBlock(plug.blockKey);
  const blockIO =
    direction === "input"
      ? block.findInput(plug.ioName)
      : block.findOutput(plug.ioName);

  return blockIO.plugs.map((blockPlug) => ({ ...blockPlug }));
}

export function resolveTrackIO(
  track: BaseTrack,
  io: TrackIO,
  direction: "input" | "output",
): BlockIO {
  return {
    ...io,
    plugs: io.plugs.flatMap((plug) => resolveTrackPlug(track, plug, direction)),
  };
}

export function scopeTrackIO(
  trackKey: string,
  track: BaseTrack,
  io: TrackIO,
  direction: "input" | "output",
): BlockIO {
  return scopeBlockIO(trackKey, resolveTrackIO(track, io, direction));
}

function scopeRoute(trackKey: string, route: IRoute): IRoute {
  return {
    ...route,
    source: scopeBlockPlug(trackKey, route.source),
    destination: scopeBlockPlug(trackKey, route.destination),
  };
}

function scopeModule(trackKey: string, module: BlockModule): BlockModule {
  return {
    ...module,
    id: scopeModuleId(trackKey, module.id),
  };
}

function scopePageSlot(
  trackKey: string,
  slot: CompiledPageSlot,
): CompiledPageSlot {
  if (slot.kind === "empty") {
    return slot;
  }

  return {
    ...slot,
    binding: {
      ...slot.binding,
      moduleId: scopeModuleId(trackKey, slot.binding.moduleId),
    },
  };
}

function scopePage(trackKey: string, page: CompiledPage): CompiledPage {
  return {
    ...page,
    regions: page.regions.map((region) => ({
      ...region,
      slots: region.slots.map((slot) =>
        scopePageSlot(trackKey, slot),
      ) as typeof region.slots,
    })) as CompiledPage["regions"],
  };
}

function scopeResolvedPage(
  trackKey: string,
  page: CompiledLaunchControlXL3Page,
): CompiledLaunchControlXL3Page {
  return {
    ...page,
    regions: page.regions.map((region) => ({
      ...region,
      slots: region.slots.map((slot) => {
        if (slot.kind === "empty") {
          return slot;
        }

        return {
          ...slot,
          binding: {
            ...slot.binding,
            moduleId: scopeModuleId(trackKey, slot.binding.moduleId),
          },
        };
      }) as typeof region.slots,
    })) as CompiledLaunchControlXL3Page["regions"],
  };
}

export function scopeCompiledTrack(
  trackKey: string,
  compiledTrack: CompiledTrack,
): CompiledTrack {
  return {
    ...compiledTrack,
    engine: {
      modules: compiledTrack.engine.modules.map((module) =>
        scopeModule(trackKey, module),
      ),
      routes: compiledTrack.engine.routes.map((route) =>
        scopeRoute(trackKey, route),
      ),
    },
    pages: compiledTrack.pages.map((page) => scopePage(trackKey, page)),
    launchControlXL3: {
      ...compiledTrack.launchControlXL3,
      resolvedPages: compiledTrack.launchControlXL3.resolvedPages.map((page) =>
        scopeResolvedPage(trackKey, page),
      ),
      midiMapper: {
        ...compiledTrack.launchControlXL3.midiMapper,
        tracks: compiledTrack.launchControlXL3.midiMapper.tracks.map(
          (track) => ({
            ...track,
            mappings: track.mappings.map((mapping) => ({
              ...mapping,
              moduleId: mapping.moduleId
                ? scopeModuleId(trackKey, mapping.moduleId)
                : undefined,
            })),
          }),
        ),
      },
    },
  };
}
