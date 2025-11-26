import { ContextTime } from "@blibliki/transport";
import { IModule, MidiEvent, Module } from "@/core";
import { ModulePropSchema, NumberProp, PropSchema } from "@/core/schema";
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

export enum MidiMappingMode {
  direct = "direct",
  toggle = "toggle",
  incDec = "incDec",
  incDecRev = "incDecRev",
}

export type MidiMapping<T extends ModuleType> = {
  cc?: number;
  moduleId?: string;
  moduleType?: T;
  propName?: string;
  autoAssign?: boolean;
  mode?: MidiMappingMode;
  threshold?: number; // For incDec mode (default: 64)
  step?: number;
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

function getMidiFromMappedValue({
  value,
  midiValue,
  propSchema,
  mapping,
}: {
  value: number;
  propSchema: NumberProp;
  midiValue: number;
  mapping: MidiMapping<ModuleType>;
}): number {
  const min = propSchema.min ?? 0;
  const max = propSchema.max ?? 1;
  const exp = propSchema.exp ?? 1;

  const { threshold = 64, mode = MidiMappingMode.incDec } = mapping;

  // Reverse the range mapping: get curvedValue
  const curvedValue = (value - min) / (max - min);

  // Reverse the exponential curve: get normalizedMidi
  const normalizedMidi = Math.pow(curvedValue, 1 / exp);

  // Reverse the MIDI normalization: get midiValue
  let newMidiValue = normalizedMidi * 127;
  newMidiValue =
    (midiValue >= threshold && mode === MidiMappingMode.incDec) ||
    (midiValue <= threshold && mode === MidiMappingMode.incDecRev)
      ? newMidiValue + 1
      : newMidiValue - 1;
  return Math.round(Math.max(0, Math.min(127, newMidiValue))); // Valid MIDI range
}

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
    let midiValue = event.ccValue;
    if (midiValue === undefined) return;

    const mode = mapping.mode ?? "direct";

    // Toggle mode: only respond to 127 (button press), ignore 0
    if (mode === MidiMappingMode.toggle && midiValue !== 127) {
      return;
    }

    const mappedModule = this.engine.findModule(mapping.moduleId);
    // @ts-expect-error TS7053 ignore this error
    const propSchema = moduleSchemas[mappedModule.moduleType][
      propName
    ] as PropSchema;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let mappedValue: any;

    // Direct mode (default) or Toggle mode: map value directly
    switch (propSchema.kind) {
      case "number": {
        midiValue =
          mode === MidiMappingMode.incDec || mode === MidiMappingMode.incDecRev
            ? getMidiFromMappedValue({
                // @ts-expect-error TS7053 ignore this error
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                value: mappedModule.props[propName],
                propSchema,
                mapping,
                midiValue,
              })
            : midiValue;
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
