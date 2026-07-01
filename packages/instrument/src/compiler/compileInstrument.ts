import { isMasterTrackDocument } from "@/document/masterTrack";
import type {
  InstrumentDocument,
  InstrumentTrackDocument,
} from "@/document/types";
import {
  CURRENT_INSTRUMENT_VERSION,
  normalizeMasterVolume,
} from "@/document/version";
import { createTrackFromDocument } from "@/tracks/createTrackFromDocument";
import { compileTrack } from "./compileTrack";
import type {
  CompiledInstrument,
  CompileInstrumentOptions,
  CompiledInstrumentLaunchControlXL3PageSummary,
  CompiledInstrumentTrack,
} from "./instrumentTypes";
import { scopeCompiledTrack } from "./scoping";

function isTrackEnabled(trackDocument: InstrumentTrackDocument) {
  return trackDocument.enabled !== false;
}

function compileInstrumentTrack(
  trackDocument: InstrumentTrackDocument,
  options: CompileInstrumentOptions,
): CompiledInstrumentTrack {
  const track = createTrackFromDocument(trackDocument, options.trackVoices);
  const name = trackDocument.name ?? trackDocument.key;

  return {
    key: trackDocument.key,
    name,
    midiChannel: track.midiChannel,
    noteSource: trackDocument.noteSource,
    audioSource: trackDocument.audioSource ?? { type: "internal" },
    sourceProfileId: trackDocument.sourceProfileId,
    fxChain: [...trackDocument.fxChain],
    compiledTrack: scopeCompiledTrack(trackDocument.key, compileTrack(track)),
  };
}

function compileLaunchControlPages(
  tracks: CompiledInstrumentTrack[],
): CompiledInstrumentLaunchControlXL3PageSummary[] {
  return tracks.flatMap((track, trackIndex) =>
    track.compiledTrack.launchControlXL3.pages.map((page) => ({
      trackKey: track.key,
      trackName: track.name,
      midiChannel: track.midiChannel,
      controllerPage: page.controllerPage,
      pageKey: page.pageKey,
      trackIndex,
    })),
  );
}

export function compileInstrument(
  document: InstrumentDocument,
  options: CompileInstrumentOptions = {},
): CompiledInstrument {
  const enabledTrackDocuments = document.tracks.filter(isTrackEnabled);

  if (enabledTrackDocuments.length === 0) {
    throw new Error("Instrument must have at least one enabled track");
  }

  // masterVolume is a global value applied to the master track's output gain.
  const masterVolume = normalizeMasterVolume(document);
  const tracks = enabledTrackDocuments.map((trackDocument) =>
    compileInstrumentTrack(
      isMasterTrackDocument(trackDocument)
        ? {
            ...trackDocument,
            controllerSlotValues: {
              ...trackDocument.controllerSlotValues,
              "trackGain.volume": masterVolume,
            },
          }
        : trackDocument,
      options,
    ),
  );

  return {
    version: CURRENT_INSTRUMENT_VERSION,
    name: document.name,
    templateId: document.templateId,
    hardwareProfileId: document.hardwareProfileId,
    globalBlock: {
      ...document.globalBlock,
      masterVolume: normalizeMasterVolume(document),
    },
    tracks,
    launchControlXL3: {
      pages: compileLaunchControlPages(tracks),
    },
  };
}
