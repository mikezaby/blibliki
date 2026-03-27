import type {
  InstrumentDocument,
  InstrumentTrackDocument,
} from "@/document/types";
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

  const tracks = enabledTrackDocuments.map((trackDocument) =>
    compileInstrumentTrack(trackDocument, options),
  );

  return {
    version: document.version,
    name: document.name,
    templateId: document.templateId,
    hardwareProfileId: document.hardwareProfileId,
    globalBlock: { ...document.globalBlock },
    tracks,
    launchControlXL3: {
      pages: compileLaunchControlPages(tracks),
    },
  };
}
