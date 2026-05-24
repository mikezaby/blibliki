import type BaseTrack from "@/tracks/BaseTrack";
import { compileLaunchControlXL3Track } from "./launchControlXL3TrackCompilation";
import { compileTrackEngine } from "./trackEngineCompilation";
import { compileTrackPages } from "./trackPageCompilation";
import type { CompiledTrack } from "./types";

export function compileTrack(track: BaseTrack): CompiledTrack {
  const pages = compileTrackPages(track);

  return {
    key: track.key,
    engine: compileTrackEngine(track),
    pages,
    launchControlXL3: compileLaunchControlXL3Track(track, pages),
  };
}
