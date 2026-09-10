import { uuidv4 } from "@blibliki/utils";
import type { VideoModuleType, VideoPropsMapping } from "@/modules";
import type { IOKind } from "./Routes";
import { voicesProp } from "./poly";
import type { PropSchema } from "./schema";

export type IVideoModule<T extends VideoModuleType = VideoModuleType> = {
  id: string;
  name: string;
  moduleType: T;
  props: VideoPropsMapping[T];
};

export type ICreateVideoModule<T extends VideoModuleType = VideoModuleType> =
  Omit<IVideoModule<T>, "id" | "props"> & {
    id?: string;
    props?: Partial<VideoPropsMapping[T]>;
  };

export type IOPort = { name: string; kind: IOKind };

// One Spectrum module's bins (dB per bin) as the host last read them.
export type SpectrumFrame = { bins: Float32Array; sampleRate: number };

export type Frame = {
  now: number;
  dt: number;
  spectra?: ReadonlyMap<string, SpectrumFrame>;
};

export type ControlValues = ReadonlyMap<string, number>;

// A note from an audio module's MIDI output, as the host forwards it.
export type MidiNoteEvent = {
  type: "noteOn" | "noteOff";
  note: number;
  velocity: number;
};

const TEXTURE_OUT: readonly IOPort[] = [{ name: "out", kind: "texture" }];

export abstract class VideoModule<T extends VideoModuleType = VideoModuleType> {
  readonly id: string;
  name: string;
  readonly moduleType: T;
  props: VideoPropsMapping[T];

  // Texture inputs in the order the shader's u_<name> samplers expect, and
  // control inputs named after the prop they drive.
  abstract readonly inputs: readonly IOPort[];
  readonly outputs: readonly IOPort[] = TEXTURE_OUT;
  abstract readonly schema: Record<keyof VideoPropsMapping[T], PropSchema>;

  constructor(
    moduleType: T,
    defaults: VideoPropsMapping[T],
    params: ICreateVideoModule<T>,
  ) {
    this.id = params.id ?? uuidv4();
    this.name = params.name;
    this.moduleType = moduleType;
    this.props = { ...defaults, ...params.props };
  }

  updateProps(props: Partial<VideoPropsMapping[T]>) {
    this.props = { ...this.props, ...props };
  }

  // Voices this module runs: its own `voices` prop when above one, else the
  // widest of its inputs, texture or control. A sink has no output and
  // composes its input instead, as Layout does by overriding this.
  voiceCount(props: Record<string, unknown>, inputVoices: number[]): number {
    const own = voicesProp(props);
    if (own > 1) return own;

    return this.outputs.length > 0 ? Math.max(1, ...inputVoices) : 1;
  }

  // Control modules compute their outputs once per frame and voice from
  // `props`, which the engine has already run through the module's control
  // routes for that voice; texture modules return null and are never ticked.
  tick(
    _values: ControlValues,
    _frame: Frame,
    _props: VideoPropsMapping[T] = this.props,
    _voice = 0,
  ): Record<string, number> | null {
    return null;
  }

  onMidi(_sourceId: string, _event: MidiNoteEvent) {
    // Note events the host tapped from audio module `sourceId`. MidiVoices
    // allocates them; every other module ignores them.
  }

  serialize(): IVideoModule<T> {
    return {
      id: this.id,
      name: this.name,
      moduleType: this.moduleType,
      props: this.props,
    };
  }
}
