import { ContextTime } from "@blibliki/transport";
import { throttle } from "es-toolkit";
import { IModule, MidiEvent, Module } from "@/core";
import { ModulePropSchema, PropSchema } from "@/core/schema";
import { ICreateModule, moduleSchemas, ModuleType } from ".";

export type IMidiMapper = IModule<ModuleType.MidiMapper>;
export type IMidiMapperProps = {
  selectedId: string | undefined | null;
  mappings: MidiMapping<ModuleType>[];
};

export type MidiMapping<T extends ModuleType> = {
  cc?: number;
  moduleId?: string;
  moduleType?: T;
  propName?: string;
  autoAssign?: boolean;
};

export const midiMapperPropSchema: ModulePropSchema<IMidiMapperProps> = {
  selectedId: {
    kind: "string",
    label: "Midi device ID",
  },
  mappings: {
    kind: "array",
    label: "Midi mapping",
  },
};

const DEFAULT_PROPS: IMidiMapperProps = { selectedId: undefined, mappings: [] };

export default class MidiMapper extends Module<ModuleType.MidiMapper> {
  declare audioNode: undefined;

  constructor(engineId: string, params: ICreateModule<ModuleType.MidiMapper>) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    super(engineId, {
      ...params,
      props,
    });

    this.addEventListener(this.props.selectedId);
  }

  protected onSetSelectedId(value: string | null) {
    if (!this.superInitialized) return;

    this.removeEventListener();
    this.addEventListener(value);
  }

  handleCC = (event: MidiEvent, _triggeredAt: ContextTime) => {
    this.checkAutoAssign(event);

    const mapping = this.props.mappings.find((m) => m.cc === event.cc);
    if (!mapping) return;
    if (
      mapping.moduleId === undefined ||
      mapping.moduleType === undefined ||
      mapping.propName === undefined
    )
      return;

    const propName = mapping.propName;

    const mappedModule = this.engine.findModule(mapping.moduleId);
    // @ts-expect-error TS7053 ignore this error
    const propSchema = moduleSchemas[mappedModule.moduleType][
      propName
    ] as PropSchema;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mappedValue: any;
    const midiValue = event.ccValue;
    if (midiValue === undefined) return;

    switch (propSchema.kind) {
      case "number": {
        const min = propSchema.min ?? 0;
        const max = propSchema.max ?? 1;
        mappedValue = min + (midiValue / 127) * (max - min);
        break;
      }
      case "enum": {
        const optionIndex = Math.floor(
          (midiValue / 127) * propSchema.options.length,
        );
        const clampedIndex = Math.min(
          optionIndex,
          propSchema.options.length - 1,
        );
        mappedValue = propSchema.options[clampedIndex];
        break;
      }

      case "boolean":
        mappedValue = midiValue >= 64;
        break;

      case "string":
        throw Error("MidiMapper not support string type of values");

      default:
        throw Error("MidiMapper unknown type");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    mappedModule.props = { [propName]: mappedValue };
    mappedModule.triggerPropsUpdate();
  };

  private addEventListener(midiId: string | undefined | null) {
    if (!midiId) return;

    const midiDevice = this.engine.findMidiDevice(midiId);
    midiDevice?.addEventListener(
      throttle(this.onMidiEvent, 5, { edges: ["leading", "trailing"] }),
    );
  }

  private removeEventListener() {
    if (!this.props.selectedId) return;

    const midiDevice = this.engine.findMidiDevice(this.props.selectedId);
    midiDevice?.removeEventListener(this.onMidiEvent);
  }

  private checkAutoAssign(event: MidiEvent) {
    if (event.cc === undefined) return;

    if (!this.props.mappings.some(({ autoAssign }) => autoAssign)) return;

    const mappings = this.props.mappings.map((mapping) => {
      if (!mapping.autoAssign) return mapping;

      return {
        ...mapping,
        cc: event.cc,
        autoAssign: false,
      };
    });

    this.props = { mappings };
    this.triggerPropsUpdate();
  }
}
