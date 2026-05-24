import type { IRoute } from "@blibliki/engine";

export type RuntimePlug = {
  moduleId: string;
  ioName: string;
};

export function createRuntimeRouteId(
  scope: string,
  source: RuntimePlug,
  destination: RuntimePlug,
) {
  return `${scope}:runtime:${source.moduleId}.${source.ioName}->${destination.moduleId}.${destination.ioName}`;
}

export function createExpandedRoutes(
  scope: string,
  sourcePlugs: readonly RuntimePlug[],
  destinationPlugs: readonly RuntimePlug[],
): IRoute[] {
  const routes: IRoute[] = [];

  for (const source of sourcePlugs) {
    for (const destination of destinationPlugs) {
      routes.push({
        id: createRuntimeRouteId(scope, source, destination),
        source,
        destination,
      });
    }
  }

  return routes;
}
