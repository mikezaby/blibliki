import { ICreateVideoModule, VideoModule } from "@/core/Module";
import { INSTANCE_LAYOUTS, InstanceLayout } from "@/core/instances";
import { EnumProp, ModulePropSchema } from "@/core/schema";
import { VideoModuleType } from ".";

export type ILayoutProps = { layout: InstanceLayout };

const DEFAULT_PROPS: ILayoutProps = { layout: "grid" };

export const layoutPropSchema: ModulePropSchema<
  ILayoutProps,
  { layout: EnumProp<InstanceLayout> }
> = {
  layout: {
    kind: "enum",
    options: [...INSTANCE_LAYOUTS],
    label: "Layout",
    shortLabel: "layout",
  },
};

// Tiles the instances of its input into one texture, so the modules after it
// run once on the whole picture. Each instance shows its own region of its
// frame, as glijs's cubes and strips do.
// ponytail: add a fit that scales each frame into its cell when wanted.
export default class Layout extends VideoModule<VideoModuleType.Layout> {
  readonly inputs = [{ name: "in", kind: "texture" }] as const;
  readonly schema = layoutPropSchema;

  constructor(params: ICreateVideoModule<VideoModuleType.Layout>) {
    super(VideoModuleType.Layout, DEFAULT_PROPS, params);
  }

  instanceCount(): number {
    return 1;
  }
}
