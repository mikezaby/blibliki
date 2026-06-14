export function createInstrumentRuntimeModuleId(suffix: string) {
  return `instrument.runtime.${suffix}`;
}

export function createTrackRuntimeModuleId(trackKey: string, suffix: string) {
  return `${trackKey}.runtime.${suffix}`;
}
