import type { VideoModule } from "./Module";
import { NumberProp } from "./schema";

// A module opts into instances by spreading these into its props and
// schema. The engine then runs the module once per instance. See
// docs/adr/0006 and docs/adr/0009.
export type IInstancesProps = { instances: number };

export const DEFAULT_INSTANCES_PROPS: IInstancesProps = { instances: 1 };

export const instancesPropSchema: { instances: NumberProp } = {
  instances: {
    kind: "number",
    min: 1,
    max: 81,
    step: 1,
    label: "Instances",
    shortLabel: "inst",
  },
};

export function instancesProp(props: Record<string, unknown>): number {
  const instances = props.instances;
  return typeof instances === "number" ? Math.max(1, Math.round(instances)) : 1;
}

// Instance count of every module: its own `instances` prop, as an audio
// module's voice count is its own setting. A module without the prop is
// single.
export function resolveInstances(
  modules: ReadonlyMap<string, VideoModule>,
  propsOf: (module: VideoModule) => Record<string, unknown>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [id, module] of modules) {
    counts.set(id, instancesProp(propsOf(module)));
  }

  return counts;
}

export const INSTANCE_LAYOUTS = ["grid", "strips"] as const;
export type InstanceLayout = (typeof INSTANCE_LAYOUTS)[number];

export type Rect = { x: number; y: number; width: number; height: number };

// Cell of instance `instanceNo` in unit coordinates, y up as in GL. Grid is
// the squarest layout that fits, filled row-major from the top left; strips
// are full-width rows from the top.
export function instanceRect(
  instanceNo: number,
  instances: number,
  layout: InstanceLayout,
): Rect {
  const cols = layout === "strips" ? 1 : Math.ceil(Math.sqrt(instances));
  const rows = Math.ceil(instances / cols);
  const col = instanceNo % cols;
  const row = Math.floor(instanceNo / cols);
  const width = 1 / cols;
  const height = 1 / rows;

  return { x: col * width, y: 1 - (row + 1) * height, width, height };
}
