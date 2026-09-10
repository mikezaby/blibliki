import { assertNever } from "@blibliki/utils";
import { ICreateVideoModule, IOPort, VideoModule } from "@/core/Module";
import { PropSchema } from "@/core/schema";
import AudioProp, { audioPropPropSchema, IAudioPropProps } from "./AudioProp";
import Band, { bandPropSchema, IBandProps } from "./Band";
import Envelope, { envelopePropSchema, IEnvelopeProps } from "./Envelope";
import HueRotate, { hueRotatePropSchema, IHueRotateProps } from "./HueRotate";
import LFO, { ILFOProps, lfoPropSchema } from "./LFO";
import Layout, { ILayoutProps, layoutPropSchema } from "./Layout";
import Merge, { IMergeProps, mergePropSchema } from "./Merge";
import MidiNotes, { IMidiNotesProps, midiNotesPropSchema } from "./MidiNotes";
import Output, { IOutputProps, outputPropSchema } from "./Output";
import Source, { ISourceProps, sourcePropSchema } from "./Source";

export enum VideoModuleType {
  Source = "Source",
  HueRotate = "HueRotate",
  Merge = "Merge",
  Layout = "Layout",
  Output = "Output",
  AudioProp = "AudioProp",
  LFO = "LFO",
  Envelope = "Envelope",
  Band = "Band",
  MidiNotes = "MidiNotes",
}

export type VideoPropsMapping = {
  [VideoModuleType.Source]: ISourceProps;
  [VideoModuleType.HueRotate]: IHueRotateProps;
  [VideoModuleType.Merge]: IMergeProps;
  [VideoModuleType.Layout]: ILayoutProps;
  [VideoModuleType.Output]: IOutputProps;
  [VideoModuleType.AudioProp]: IAudioPropProps;
  [VideoModuleType.LFO]: ILFOProps;
  [VideoModuleType.Envelope]: IEnvelopeProps;
  [VideoModuleType.Band]: IBandProps;
  [VideoModuleType.MidiNotes]: IMidiNotesProps;
};

export function createModule<T extends VideoModuleType>(
  params: ICreateVideoModule<T>,
): VideoModule {
  const type: VideoModuleType = params.moduleType;
  switch (type) {
    case VideoModuleType.Source:
      return new Source(params as ICreateVideoModule<VideoModuleType.Source>);
    case VideoModuleType.HueRotate:
      return new HueRotate(
        params as ICreateVideoModule<VideoModuleType.HueRotate>,
      );
    case VideoModuleType.Merge:
      return new Merge(params as ICreateVideoModule<VideoModuleType.Merge>);
    case VideoModuleType.Layout:
      return new Layout(params as ICreateVideoModule<VideoModuleType.Layout>);
    case VideoModuleType.Output:
      return new Output(params as ICreateVideoModule<VideoModuleType.Output>);
    case VideoModuleType.AudioProp:
      return new AudioProp(
        params as ICreateVideoModule<VideoModuleType.AudioProp>,
      );
    case VideoModuleType.LFO:
      return new LFO(params as ICreateVideoModule<VideoModuleType.LFO>);
    case VideoModuleType.Envelope:
      return new Envelope(
        params as ICreateVideoModule<VideoModuleType.Envelope>,
      );
    case VideoModuleType.Band:
      return new Band(params as ICreateVideoModule<VideoModuleType.Band>);
    case VideoModuleType.MidiNotes:
      return new MidiNotes(
        params as ICreateVideoModule<VideoModuleType.MidiNotes>,
      );
    default:
      return assertNever(type);
  }
}

export type { IAudioPropProps } from "./AudioProp";
export type { IBandProps } from "./Band";
export type { IEnvelopeProps } from "./Envelope";
export type { IHueRotateProps } from "./HueRotate";
export type { ILayoutProps } from "./Layout";
export type { ILFOProps, LFOWaveform } from "./LFO";
export { LFO_WAVEFORMS } from "./LFO";
export type { IMergeProps, MergeMode } from "./Merge";
export type { IMidiNotesProps } from "./MidiNotes";
export { MERGE_MODES } from "./Merge";
export type { IOutputProps } from "./Output";
export type { ISourceProps, SourceMode } from "./Source";

export const videoModuleSchemas: Record<
  VideoModuleType,
  Record<string, PropSchema>
> = {
  [VideoModuleType.Source]: sourcePropSchema,
  [VideoModuleType.HueRotate]: hueRotatePropSchema,
  [VideoModuleType.Merge]: mergePropSchema,
  [VideoModuleType.Layout]: layoutPropSchema,
  [VideoModuleType.Output]: outputPropSchema,
  [VideoModuleType.AudioProp]: audioPropPropSchema,
  [VideoModuleType.LFO]: lfoPropSchema,
  [VideoModuleType.Envelope]: envelopePropSchema,
  [VideoModuleType.Band]: bandPropSchema,
  [VideoModuleType.MidiNotes]: midiNotesPropSchema,
};

const PROTOTYPES = Object.fromEntries(
  Object.values(VideoModuleType).map((moduleType) => [
    moduleType,
    createModule({ name: moduleType, moduleType }),
  ]),
) as Record<VideoModuleType, VideoModule>;

export function inputsFor(moduleType: VideoModuleType): readonly IOPort[] {
  return PROTOTYPES[moduleType].inputs;
}

export function outputsFor(moduleType: VideoModuleType): readonly IOPort[] {
  return PROTOTYPES[moduleType].outputs;
}
