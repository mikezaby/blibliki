import { assertNever } from "@blibliki/utils";
import { ICreateVideoModule, IOPort, VideoModule } from "@/core/Module";
import { PropSchema } from "@/core/schema";
import AudioProp, { audioPropPropSchema, IAudioPropProps } from "./AudioProp";
import Band, { bandPropSchema, IBandProps } from "./Band";
import Color, { colorPropSchema, IColorProps } from "./Color";
import Envelope, { envelopePropSchema, IEnvelopeProps } from "./Envelope";
import Feedback, { feedbackPropSchema, IFeedbackProps } from "./Feedback";
import HueRotate, { hueRotatePropSchema, IHueRotateProps } from "./HueRotate";
import LFO, { ILFOProps, lfoPropSchema } from "./LFO";
import Layout, { ILayoutProps, layoutPropSchema } from "./Layout";
import Merge, { IMergeProps, mergePropSchema } from "./Merge";
import MidiNotes, { IMidiNotesProps, midiNotesPropSchema } from "./MidiNotes";
import Mirror, { IMirrorProps, mirrorPropSchema } from "./Mirror";
import Noise, { INoiseProps, noisePropSchema } from "./Noise";
import Output, { IOutputProps, outputPropSchema } from "./Output";
import Shapes, { IShapesProps, shapesPropSchema } from "./Shapes";
import Source, { ISourceProps, sourcePropSchema } from "./Source";
import Transform, { ITransformProps, transformPropSchema } from "./Transform";

export enum VideoModuleType {
  Source = "Source",
  Noise = "Noise",
  Shapes = "Shapes",
  HueRotate = "HueRotate",
  Color = "Color",
  Transform = "Transform",
  Mirror = "Mirror",
  Feedback = "Feedback",
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
  [VideoModuleType.Noise]: INoiseProps;
  [VideoModuleType.Shapes]: IShapesProps;
  [VideoModuleType.HueRotate]: IHueRotateProps;
  [VideoModuleType.Color]: IColorProps;
  [VideoModuleType.Transform]: ITransformProps;
  [VideoModuleType.Mirror]: IMirrorProps;
  [VideoModuleType.Feedback]: IFeedbackProps;
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
    case VideoModuleType.Noise:
      return new Noise(params as ICreateVideoModule<VideoModuleType.Noise>);
    case VideoModuleType.Shapes:
      return new Shapes(params as ICreateVideoModule<VideoModuleType.Shapes>);
    case VideoModuleType.HueRotate:
      return new HueRotate(
        params as ICreateVideoModule<VideoModuleType.HueRotate>,
      );
    case VideoModuleType.Color:
      return new Color(params as ICreateVideoModule<VideoModuleType.Color>);
    case VideoModuleType.Transform:
      return new Transform(
        params as ICreateVideoModule<VideoModuleType.Transform>,
      );
    case VideoModuleType.Mirror:
      return new Mirror(params as ICreateVideoModule<VideoModuleType.Mirror>);
    case VideoModuleType.Feedback:
      return new Feedback(
        params as ICreateVideoModule<VideoModuleType.Feedback>,
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
export type { IColorProps } from "./Color";
export type { IFeedbackProps } from "./Feedback";
export type { IHueRotateProps } from "./HueRotate";
export type { IMirrorProps, MirrorMode } from "./Mirror";
export type { INoiseProps } from "./Noise";
export type { IShapesProps, Shape } from "./Shapes";
export { SHAPES } from "./Shapes";
export { MIRROR_MODES } from "./Mirror";
export type { ITransformProps } from "./Transform";
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
  [VideoModuleType.Noise]: noisePropSchema,
  [VideoModuleType.Shapes]: shapesPropSchema,
  [VideoModuleType.HueRotate]: hueRotatePropSchema,
  [VideoModuleType.Color]: colorPropSchema,
  [VideoModuleType.Transform]: transformPropSchema,
  [VideoModuleType.Mirror]: mirrorPropSchema,
  [VideoModuleType.Feedback]: feedbackPropSchema,
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
