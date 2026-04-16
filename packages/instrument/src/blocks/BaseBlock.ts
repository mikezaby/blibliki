import { moduleSchemas, ModuleType, PropSchema } from "@blibliki/engine";
import type {
  AnyBaseSlot,
  ModulePropKey,
  SlotInitialValue,
} from "@/slots/BaseSlot";
import type { BlockKey } from "@/types";
import { createModulePropSlot } from "./helpers";
import type {
  BlockIO,
  BlockModule,
  BlockRoute,
  CreateBlockIO,
  CreateBlockRoute,
  SerializedBlock,
  UpdateBlockModule,
} from "./types";

function createRouteId() {
  return crypto.randomUUID();
}

export default abstract class BaseBlock {
  readonly key: BlockKey;
  readonly type: string;

  protected readonly _modules = new Map<string, BlockModule>();
  protected readonly _routes = new Map<string, BlockRoute>();
  protected readonly _inputs = new Map<string, BlockIO>();
  protected readonly _outputs = new Map<string, BlockIO>();
  protected readonly _slots = new Map<string, AnyBaseSlot>();

  protected constructor(key: BlockKey, type: string) {
    this.key = key;
    this.type = type;
  }

  get modules(): ReadonlyMap<string, BlockModule> {
    return this._modules;
  }

  get routes(): ReadonlyMap<string, BlockRoute> {
    return this._routes;
  }

  get inputs(): ReadonlyMap<string, BlockIO> {
    return this._inputs;
  }

  get outputs(): ReadonlyMap<string, BlockIO> {
    return this._outputs;
  }

  get slots(): ReadonlyMap<string, AnyBaseSlot> {
    return this._slots;
  }

  addModule<T extends ModuleType>(module: BlockModule<T>) {
    this._modules.set(module.id, module);

    Object.entries(moduleSchemas[module.moduleType]).forEach(
      ([propKey, schema]) => {
        const propSchema = schema as PropSchema;
        const { label, shortLabel } = propSchema;
        if (
          propSchema.kind !== "number" &&
          propSchema.kind !== "enum" &&
          propSchema.kind !== "boolean"
        ) {
          return;
        }

        this.addSlot(
          createModulePropSlot({
            key: module.slotSuffix ? `${propKey}${module.slotSuffix}` : propKey,
            label,
            shortLabel: shortLabel.toUpperCase(),
            moduleType: module.moduleType,
            moduleId: module.id,
            propKey: propKey as ModulePropKey<T>,
            initialValue: module.props[propKey as ModulePropKey<T>] as
              | SlotInitialValue
              | undefined,
          }) as unknown as AnyBaseSlot,
        );
      },
    );

    return module;
  }

  updateModule(id: string, changes: UpdateBlockModule) {
    const module = this.findModule(id);
    const updated: BlockModule = {
      ...module,
      ...changes,
      id: module.id,
    };

    this._modules.set(id, updated);
    return updated;
  }

  removeModule(id: string) {
    this._modules.delete(id);
  }

  addInput(input: CreateBlockIO) {
    this._inputs.set(input.ioName, input);
    return input;
  }

  removeInput(ioName: string) {
    this._inputs.delete(ioName);
  }

  addOutput(output: CreateBlockIO) {
    this._outputs.set(output.ioName, output);
    return output;
  }

  removeOutput(ioName: string) {
    this._outputs.delete(ioName);
  }

  addRoute(props: CreateBlockRoute) {
    const id = props.id ?? createRouteId();
    const route: BlockRoute = { ...props, id };
    this._routes.set(id, route);
    return route;
  }

  removeRoute(id: string) {
    this._routes.delete(id);
  }

  addSlot(slot: AnyBaseSlot) {
    this._slots.set(slot.key, slot);
    return slot;
  }

  updateSlot(key: string, changes: Partial<Omit<AnyBaseSlot, "key">>) {
    const slot = this.findSlot(key);
    const updated = {
      ...slot,
      ...changes,
      key: slot.key,
    } as AnyBaseSlot;

    this._slots.set(key, updated);
    return updated;
  }

  removeSlot(key: string) {
    this._slots.delete(key);
  }

  findModule(id: string) {
    const module = this._modules.get(id);
    if (!module) {
      throw Error(`Module ${id} not found in block ${this.key}`);
    }

    return module;
  }

  findRoute(id: string) {
    const route = this._routes.get(id);
    if (!route) {
      throw Error(`Route ${id} not found in block ${this.key}`);
    }

    return route;
  }

  findInput(ioName: string) {
    const input = this._inputs.get(ioName);
    if (!input) {
      throw Error(`Input ${ioName} not found in block ${this.key}`);
    }

    return input;
  }

  findOutput(ioName: string) {
    const output = this._outputs.get(ioName);
    if (!output) {
      throw Error(`Output ${ioName} not found in block ${this.key}`);
    }

    return output;
  }

  findSlot(key: string) {
    const slot = this._slots.get(key);
    if (!slot) {
      throw Error(`Slot ${key} not found in block ${this.key}`);
    }

    return slot;
  }

  serialize(): SerializedBlock {
    return {
      key: this.key,
      type: this.type,
      modules: Array.from(this._modules.values()),
      routes: Array.from(this._routes.values()),
      inputs: Array.from(this._inputs.values()),
      outputs: Array.from(this._outputs.values()),
      slots: Array.from(this._slots.values()),
    };
  }
}
