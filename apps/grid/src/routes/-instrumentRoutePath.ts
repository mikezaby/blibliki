export function isInstrumentDebugPath(pathname: string, instrumentId: string) {
  return pathname === `/instrument/${instrumentId}/debug`;
}

export function isInstrumentPerformancePath(
  pathname: string,
  instrumentId: string,
) {
  return pathname === `/instrument/${instrumentId}/performance`;
}

export function isInstrumentPerformanceRoutePath(pathname: string) {
  return /^\/instrument\/[^/]+\/performance$/.test(pathname);
}
