import { ContextTime } from "@blibliki/transport";
import { IModule, MidiEvent, MidiOutput, Module, SetterHooks } from "@/core";
import { ModulePropSchema, NumberProp, PropSchema } from "@/core/schema";
import { ICreateModule, moduleSchemas, ModuleType } from ".";

export type IMidiMapper = IModule<ModuleType.MidiMapper>;
export type IMidiMapperProps = {
  pages: MidiMappingPage[];
  activePage: number;
  globalMappings: MidiMapping<ModuleType>[];
};

export type MidiMappingPage = {
  name?: string;
  mappings: MidiMapping<ModuleType>[];
};

export enum MidiMappingMode {
  direct = "direct",
  directRev = "directRev",
  toggleInc = "toggleInc",
  toggleDec = "toggleDec",
  incDec = "incDec",
  incDecRev = "incDecRev",
}

export type MidiMapping<T extends ModuleType> = {
  cc?: number;
  value?: number;
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
  globalMappings: {
    kind: "array",
    label: "Global midi mappings",
  },
};

const DEFAULT_PROPS: IMidiMapperProps = {
  pages: [{ name: "Page 1", mappings: [{}] }],
  activePage: 0,
  globalMappings: [{}],
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

  const { threshold = 64, mode } = mapping;

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

function normalizeNumberToMidi(value: number, propSchema: NumberProp): number {
  const min = propSchema.min ?? 0;
  const max = propSchema.max ?? 1;
  if (max <= min) return 0;

  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const exp = propSchema.exp ?? 1;
  const midi = Math.pow(normalized, 1 / exp) * 127;
  return Math.round(Math.max(0, Math.min(127, midi)));
}

const LAUNCH_CONTROL_DAW_OUTPUT_NAMES = [
  "LCXL3 DAW",
  "Launch Control XL 3 DAW",
  "Launch Control XL3 DAW",
  "Launch Control XL 3",
] as const;

function getLaunchControlDawFeedbackStatus(cc: number): number {
  // Launch Control XL 3 DAW mode:
  // - Faders/encoders (CC 5-36) use channel 16
  // - Shift (CC 63) and display brightness (CC 112) use channel 7
  // - Buttons/navigation use channel 1
  if (cc >= 5 && cc <= 36) return 0xbf;
  if (cc === 63 || cc === 112) return 0xb6;
  return 0xb0;
}

function toLaunchControlDawFeedbackMessage(
  cc: number,
  value: number,
): Uint8Array {
  return new Uint8Array([getLaunchControlDawFeedbackStatus(cc), cc, value]);
}

type MidiMapperSetterHooks = Pick<
  SetterHooks<IMidiMapperProps>,
  "onSetActivePage"
>;

export default class MidiMapper
  extends Module<ModuleType.MidiMapper>
  implements MidiMapperSetterHooks
{
  declare audioNode: undefined;
  private _midiOut: MidiOutput; // Will be used to send CC values on page change

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

    this._midiOut = this.registerMidiOutput({
      name: "midi out",
    });

    // Defer initial sync so patch-load routes can be connected first.
    queueMicrotask(() => {
      this.syncControllerValues();
    });
  }

  onSetActivePage: MidiMapperSetterHooks["onSetActivePage"] = (value) => {
    const activePage = Math.max(
      Math.min(value, this.props.pages.length - 1),
      0,
    );

    queueMicrotask(() => {
      this.syncControllerValues();
    });

    return activePage;
  };

  syncControllerValues = () => {
    const activePage = this.props.pages[this.props.activePage];
    const ccValues = new Map<number, number>();

    this.props.globalMappings.forEach((mapping) => {
      const value = this.resolveSyncValue(mapping);
      if (mapping.cc === undefined || value === undefined) return;
      ccValues.set(mapping.cc, value);
    });

    activePage?.mappings.forEach((mapping) => {
      const value = this.resolveSyncValue(mapping);
      if (mapping.cc === undefined || value === undefined) return;
      ccValues.set(mapping.cc, value);
    });

    if (ccValues.size === 0) return;

    const now = this.context.currentTime;
    const controllerOutput = this.findLaunchControlDawOutput();

    ccValues.forEach((value, cc) => {
      const event = MidiEvent.fromCC(cc, value, now);
      this._midiOut.onMidiEvent(event);
      controllerOutput?.send(toLaunchControlDawFeedbackMessage(cc, value));
    });
  };

  private findLaunchControlDawOutput() {
    for (const candidate of LAUNCH_CONTROL_DAW_OUTPUT_NAMES) {
      const match = this.engine.findMidiOutputDeviceByFuzzyName(
        candidate,
        0.45,
      );
      if (match) return match.device;
    }

    return undefined;
  }

  private resolveSyncValue(
    mapping: MidiMapping<ModuleType>,
  ): number | undefined {
    const {
      moduleId,
      moduleType,
      propName,
      mode = MidiMappingMode.direct,
      value,
    } = mapping;

    if (
      moduleId === undefined ||
      moduleType === undefined ||
      propName === undefined
    )
      return value;

    let mappedModule: ReturnType<typeof this.engine.findModule>;
    try {
      mappedModule = this.engine.findModule(moduleId);
    } catch {
      return value;
    }

    if (mappedModule.moduleType !== moduleType) return value;

    // Modes based on relative/button actions don't have a stable absolute CC target.
    if (
      mode === MidiMappingMode.incDec ||
      mode === MidiMappingMode.incDecRev ||
      mode === MidiMappingMode.toggleInc ||
      mode === MidiMappingMode.toggleDec
    ) {
      return value;
    }

    // @ts-expect-error TS7053 ignore dynamic prop key access
    const propSchema = moduleSchemas[mappedModule.moduleType][
      propName
    ] as PropSchema;
    // @ts-expect-error TS7053 ignore dynamic prop key access
    const propValue = mappedModule.props[propName] as unknown;

    switch (propSchema.kind) {
      case "number": {
        if (typeof propValue !== "number") return value;
        let midiValue = normalizeNumberToMidi(propValue, propSchema);
        if (mode === MidiMappingMode.directRev) midiValue = 127 - midiValue;
        return midiValue;
      }
      case "boolean":
        if (typeof propValue !== "boolean") return value;
        return propValue ? 127 : 0;
      case "enum": {
        const options = propSchema.options;
        const index = options.findIndex((option) => option === propValue);
        if (index < 0) return value;
        if (options.length === 1) return 0;
        return Math.round((index / (options.length - 1)) * 127);
      }
      case "string":
      case "array":
        return value;
      default:
        return value;
    }
  }

  handleCC = (event: MidiEvent, triggeredAt: ContextTime) => {
    this.checkAutoAssign(event);

    const activePage = this.props.pages[this.props.activePage];
    if (!activePage) return;

    const matchingMappings = [
      ...this.props.globalMappings.filter((m) => m.cc === event.cc),
      ...activePage.mappings.filter((m) => m.cc === event.cc),
    ];

    // Forward all matching mappings
    matchingMappings.forEach((mapping) => {
      this.forwardMapping(event, mapping, triggeredAt);
    });

    // Update mapping values if we have matching CCs
    if (matchingMappings.length > 0 && event.ccValue !== undefined) {
      const updatedGlobalMappings = this.props.globalMappings.map((mapping) => {
        if (mapping.cc === event.cc) {
          return { ...mapping, value: event.ccValue };
        }
        return mapping;
      });

      const updatedPageMappings = activePage.mappings.map((mapping) => {
        if (mapping.cc === event.cc) {
          return { ...mapping, value: event.ccValue };
        }
        return mapping;
      });

      const updatedPages = this.props.pages.map((page, index) =>
        index === this.props.activePage
          ? { ...page, mappings: updatedPageMappings }
          : page,
      );

      this.props = {
        pages: updatedPages,
        globalMappings: updatedGlobalMappings,
      };
      this.triggerPropsUpdate();
    }
  };

  forwardMapping = (
    event: MidiEvent,
    mapping: MidiMapping<ModuleType>,
    _triggeredAt: ContextTime,
  ) => {
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
    if (
      (mode === MidiMappingMode.toggleInc ||
        mode === MidiMappingMode.toggleDec) &&
      midiValue !== 127
    ) {
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
        // @ts-expect-error TS7053 ignore this error
        const currentValue = mappedModule.props[propName] as number;

        if (
          mode === MidiMappingMode.incDec ||
          mode === MidiMappingMode.incDecRev
        ) {
          midiValue = getMidiFromMappedValue({
            value: currentValue,
            propSchema,
            mapping,
            midiValue,
          });
        } else if (mode === MidiMappingMode.directRev) {
          midiValue = 127 - midiValue;
        }

        if (mode === MidiMappingMode.toggleInc) {
          mappedValue = currentValue + (propSchema.step ?? 1);
        } else if (mode === MidiMappingMode.toggleDec) {
          mappedValue = currentValue - (propSchema.step ?? 1);
        } else {
          const min = propSchema.min ?? 0;
          const max = propSchema.max ?? 1;
          const normalizedMidi = midiValue / 127;
          const curvedValue = Math.pow(normalizedMidi, propSchema.exp ?? 1);
          mappedValue = min + curvedValue * (max - min);

          // Round to step if defined
          if (
            propSchema.step !== undefined &&
            (!propSchema.exp || propSchema.exp === 1)
          ) {
            const steps = Math.round((mappedValue - min) / propSchema.step);
            mappedValue = min + steps * propSchema.step;
          }
        }

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
    if (!activePage) return;

    const hasGlobalAutoAssign = this.props.globalMappings.some(
      ({ autoAssign }) => autoAssign,
    );
    const hasPageAutoAssign = activePage.mappings.some(
      ({ autoAssign }) => autoAssign,
    );

    if (!hasGlobalAutoAssign && !hasPageAutoAssign) return;

    // Update global mappings if needed
    const updatedGlobalMappings = hasGlobalAutoAssign
      ? this.props.globalMappings.map((mapping) => {
          if (!mapping.autoAssign) return mapping;

          return {
            ...mapping,
            cc: event.cc,
            autoAssign: false,
          };
        })
      : this.props.globalMappings;

    // Update page mappings if needed
    const updatedPageMappings = hasPageAutoAssign
      ? activePage.mappings.map((mapping) => {
          if (!mapping.autoAssign) return mapping;

          return {
            ...mapping,
            cc: event.cc,
            autoAssign: false,
          };
        })
      : activePage.mappings;

    const updatedPages = this.props.pages.map((page, index) =>
      index === this.props.activePage
        ? { ...page, mappings: updatedPageMappings }
        : page,
    );

    this.props = { pages: updatedPages, globalMappings: updatedGlobalMappings };
    this.triggerPropsUpdate();
  }
}
