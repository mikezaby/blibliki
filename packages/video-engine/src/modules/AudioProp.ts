import {
  ControlValues,
  ICreateVideoModule,
  IOPort,
  VideoModule,
} from "@/core/Module";
import { AudioModuleProp, ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type IAudioPropProps = { moduleId: string; prop: string };

const DEFAULT_PROPS: IAudioPropProps = { moduleId: "", prop: "" };

export const audioPropPropSchema: ModulePropSchema<
  IAudioPropProps,
  { moduleId: AudioModuleProp }
> = {
  moduleId: {
    kind: "audioModule",
    label: "Module",
    shortLabel: "mod",
  },
  prop: {
    kind: "string",
    label: "Prop",
    shortLabel: "prop",
  },
};

// Mirrors one numeric prop of an audio module as a control output. The value
// is raw; the control route's range normalizes it, filled from the audio
// prop's schema when the cable is connected.
export default class AudioProp extends VideoModule<VideoModuleType.AudioProp> {
  readonly inputs = [] as const;
  readonly outputs: readonly IOPort[] = [{ name: "out", kind: "control" }];
  readonly schema = audioPropPropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.AudioProp>) {
    super(VideoModuleType.AudioProp, DEFAULT_PROPS, params);
  }

  tick(values: ControlValues) {
    const { moduleId, prop } = this.props;

    return { out: values.get(`patch:${moduleId}:${prop}`) ?? 0 };
  }
}
