import type { IRoute } from "@blibliki/engine";
import type {
  BlockIO,
  BlockPlug,
  BlockRoute,
  BlockModule,
} from "@/blocks/types";
import type BaseTrack from "@/tracks/BaseTrack";
import type { TrackRoute } from "@/tracks/types";

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

export function compileTrackEngine(track: BaseTrack) {
  return {
    modules: compileModules(track),
    routes: [...compileBlockRoutes(track), ...compileTrackRoutes(track)],
  };
}
