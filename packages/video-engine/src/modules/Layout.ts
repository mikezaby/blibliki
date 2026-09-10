import { ICreateVideoModule, VideoModule } from "@/core/Module";
import { VOICE_LAYOUTS, VoiceLayout } from "@/core/poly";
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type ILayoutProps = { layout: VoiceLayout };

const DEFAULT_PROPS: ILayoutProps = { layout: "grid" };

export const layoutPropSchema: ModulePropSchema<
  ILayoutProps,
  { layout: EnumProp<VoiceLayout> }
> = {
  layout: {
    kind: "enum",
    options: [...VOICE_LAYOUTS],
    label: "Layout",
    shortLabel: "layout",
  },
};

// Tiles the voices of its input into one texture, so the modules after it
// run once on the whole picture. Each voice shows its own region of its
// frame, as glijs's cubes and strips do.
// ponytail: add a fit that scales each frame into its cell when wanted.
export default class Layout extends VideoModule<VideoModuleType.Layout> {
  readonly inputs = [{ name: "in", kind: "texture" }] as const;
  readonly schema = layoutPropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Layout>) {
    super(VideoModuleType.Layout, DEFAULT_PROPS, params);
  }

  voiceCount(): number {
    return 1;
  }
}
