import type { VideoModule } from "./Module";
import type { Routes } from "./Routes";
import { NumberProp } from "./schema";

// A texture module opts into instances by spreading these into its props and
// schema. The engine then renders the module, and everything after it,
// once per instance. See docs/adr/0006.
export type IInstancesProps = { instances: number };

export const DEFAULT_INSTANCES_PROPS: IInstancesProps = { instances: 1 };

export const instancesPropSchema: { instances: NumberProp } = {
  instances: {
    kind: "number",
    min: 1,
    max: 81,
    step: 1,
    label: "Instances",
    shortLabel: "instances",
  },
};

export function instancesProp(props: Record<string, unknown>): number {
  const instances = props.instances;
  return typeof instances === "number" ? Math.max(1, Math.round(instances)) : 1;
}

export const INSTANCE_LAYOUTS = ["grid", "strips"] as const;
export type InstanceLayout = (typeof INSTANCE_LAYOUTS)[number];

export type Rect = { x: number; y: number; width: number; height: number };

// Cell of instance `instanceNo` in unit coordinates, y up as in GL. Grid is the
// squarest layout that fits, filled row-major from the top left; strips are
// full-width rows from the top.
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

// Instance count of every module. Each module gets the widths of its texture
// inputs and of the control sources routed into it, so instances flow down
// routes of either kind.
// ponytail: a control feedback loop counts as single where it closes.
export function resolveInstances(
  modules: ReadonlyMap<string, VideoModule>,
  routes: Routes,
  propsOf: (module: VideoModule) => Record<string, unknown>,
): Map<string, number> {
  const instanceCounts = new Map<string, number>();
  const visiting = new Set<string>();

  const visit = (id: string): number => {
    const known = instanceCounts.get(id);
    if (known !== undefined) return known;
    const module = modules.get(id);
    if (!module || visiting.has(id)) return 1;

    visiting.add(id);
    const inputInstances: number[] = [];
    for (const input of module.inputs) {
      if (input.kind !== "texture") continue;
      const sourceId = routes.sourceFor(id, input.name);
      if (sourceId !== null) inputInstances.push(visit(sourceId));
    }
    for (const route of routes.controlRoutesFor(id)) {
      inputInstances.push(visit(route.source.moduleId));
    }
    visiting.delete(id);

    const instances = module.instanceCount(propsOf(module), inputInstances);
    instanceCounts.set(id, instances);

    return instances;
  };

  for (const id of modules.keys()) visit(id);

  return instanceCounts;
}
