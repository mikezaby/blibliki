import { ContextTime } from "@blibliki/transport";
import { IModule, MidiEvent, Module } from "@/core";
import { ModulePropSchema, PropSchema } from "@/core/schema";
import { ICreateModule, moduleSchemas, ModuleType } from ".";

export type IMidiMapper = IModule<ModuleType.MidiMapper>;
export type IMidiMapperProps = {
  pages: MidiMappingPage[];
  activePage: number;
};

export type MidiMappingPage = {
  name?: string;
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
  pages: {
    kind: "array",
    label: "Midi mapping pages",
  },
  activePage: {
    kind: "number",
    label: "Active page",
    min: 0,
    max: 100,
    step: 1,
  },
};

const DEFAULT_PROPS: IMidiMapperProps = {
  pages: [{ name: "Page 1", mappings: [{}] }],
  activePage: 0,
};

export default class MidiMapper extends Module<ModuleType.MidiMapper> {
  declare audioNode: undefined;

  constructor(engineId: string, params: ICreateModule<ModuleType.MidiMapper>) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    super(engineId, {
      ...params,
      props,
    });

    this.registerMidiInput({
      name: "midi in",
      onMidiEvent: this.onMidiEvent,
    });
  }

  handleCC = (event: MidiEvent, _triggeredAt: ContextTime) => {
    this.checkAutoAssign(event);

    const activePage = this.props.pages[this.props.activePage];

    const mapping = activePage.mappings.find((m) => m.cc === event.cc);
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
        const normalizedMidi = midiValue / 127;
        const curvedValue = Math.pow(normalizedMidi, propSchema.exp ?? 1);
        mappedValue = min + curvedValue * (max - min);
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
      case "array":
        throw Error("MidiMapper not support array type of values");

      default:
        throw Error("MidiMapper unknown type");
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    mappedModule.props = { [propName]: mappedValue };
    mappedModule.triggerPropsUpdate();
  };

  private checkAutoAssign(event: MidiEvent) {
    if (event.cc === undefined) return;

    const activePage = this.props.pages[this.props.activePage];
    if (!activePage.mappings.some(({ autoAssign }) => autoAssign)) return;

    const updatedMappings = activePage.mappings.map((mapping) => {
      if (!mapping.autoAssign) return mapping;

      return {
        ...mapping,
        cc: event.cc,
        autoAssign: false,
      };
    });

    const updatedPages = this.props.pages.map((page, index) =>
      index === this.props.activePage
        ? { ...page, mappings: updatedMappings }
        : page,
    );

    this.props = { pages: updatedPages };
    this.triggerPropsUpdate();
  }
}
