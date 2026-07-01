import type { IRoute } from "@blibliki/engine";
import type { BlockPlug } from "@/blocks/types";
import { createExpandedRoutes } from "@/core/runtimeRoutes";
import type { InstrumentTrackDocument } from "@/document/types";
import type BaseTrack from "@/tracks/BaseTrack";
import { scopeTrackIO } from "./scoping";

function createTrackToTrackRoutes(
  trackDocuments: readonly InstrumentTrackDocument[],
  tracksByKey: ReadonlyMap<string, BaseTrack>,
): IRoute[] {
  return trackDocuments.flatMap((trackDocument) => {
    if (trackDocument.audioSource?.type !== "track") {
      return [];
    }

    const sourceTrack = tracksByKey.get(trackDocument.audioSource.trackKey);
    const destinationTrack = tracksByKey.get(trackDocument.key);

    if (!sourceTrack || !destinationTrack) {
      return [];
    }

    return createExpandedRoutes(
      `${sourceTrack.key}->${destinationTrack.key}`,
      scopeTrackIO(
        sourceTrack.key,
        sourceTrack,
        sourceTrack.findOutput("audio send"),
        "output",
      ).plugs,
      scopeTrackIO(
        destinationTrack.key,
        destinationTrack,
        destinationTrack.findInput("audio in"),
        "input",
      ).plugs,
    );
  });
}

function createDirectMasterRoutes(
  trackDocuments: readonly InstrumentTrackDocument[],
  tracks: readonly BaseTrack[],
  masterTrack: BaseTrack,
): IRoute[] {
  const tracksByKey = new Map(tracks.map((track) => [track.key, track]));
  const serialSourceKeys = new Set(
    trackDocuments.flatMap((trackDocument) => {
      if (
        trackDocument.audioSource?.type !== "track" ||
        trackDocument.audioSource.mode !== "serial" ||
        !tracksByKey.has(trackDocument.key) ||
        !tracksByKey.has(trackDocument.audioSource.trackKey)
      ) {
        return [];
      }

      return [trackDocument.audioSource.trackKey];
    }),
  );
  const mixDestinationPlugs: BlockPlug[] = scopeTrackIO(
    masterTrack.key,
    masterTrack,
    masterTrack.findInput("audio in"),
    "input",
  ).plugs;

  return tracks.flatMap((track) => {
    // The master track is the mix destination, not one of the mixed sources.
    if (track.key === masterTrack.key || serialSourceKeys.has(track.key)) {
      return [];
    }

    return createExpandedRoutes(
      track.key,
      scopeTrackIO(track.key, track, track.findOutput("audio out"), "output")
        .plugs,
      mixDestinationPlugs,
    );
  });
}

export function createInstrumentAudioRoutes(options: {
  trackDocuments: readonly InstrumentTrackDocument[];
  tracks: readonly BaseTrack[];
  masterTrack: BaseTrack;
}): IRoute[] {
  const { trackDocuments, tracks, masterTrack } = options;
  const tracksByKey = new Map(tracks.map((track) => [track.key, track]));

  return [
    ...createTrackToTrackRoutes(trackDocuments, tracksByKey),
    ...createDirectMasterRoutes(trackDocuments, tracks, masterTrack),
  ];
}
