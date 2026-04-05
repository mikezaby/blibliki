import { ContextTime } from "@blibliki/transport";
import { IModule, MidiEvent, MidiOutput, Module, SetterHooks } from "@/core";
import { ModulePropSchema, NumberProp, PropSchema } from "@/core/schema";
import { ICreateModule, moduleSchemas, ModuleType } from "..";
import MidiMapperSyncValues from "./MidiMapperSyncValues";

export type IMidiMapper = IModule<ModuleType.MidiMapper>;
export type IMidiMapperProps = {
  tracks: MidiMappingTrack[];
  activeTrack: number;
  globalMappings: MidiMapping<ModuleType>[];
};

export type MidiMappingTrack = {
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
  moduleId?: string;
  moduleType?: T;
  propName?: string;
  autoAssign?: boolean;
  mode?: MidiMappingMode;
  threshold?: number; // For incDec mode (default: 64)
  step?: number;
};

export const midiMapperPropSchema: ModulePropSchema<IMidiMapperProps> = {
  tracks: {
    kind: "array",
    label: "Midi mapping tracks",
    shortLabel: "tracks",
  },
  activeTrack: {
    kind: "number",
    label: "Active track",
    shortLabel: "active",
    min: 0,
    max: 100,
    step: 1,
  },
  globalMappings: {
    kind: "array",
    label: "Global midi mappings",
    shortLabel: "global",
  },
};

const DEFAULT_PROPS: IMidiMapperProps = {
  tracks: [{ name: "Track 1", mappings: [{} as MidiMapping<ModuleType>] }],
  activeTrack: 0,
  globalMappings: [{} as MidiMapping<ModuleType>],
};

const DEFAULT_RELATIVE_THRESHOLD = 64;
const DEFAULT_RELATIVE_ENUM_TICKS = 2;
const MIDI_MAX_VALUE = 127;

type RelativeNumberState = {
  normalizedValue: number;
  lastPropValue: number;
};

type RelativeEnumState<T extends string | number> = {
  accumulatedDelta: number;
  lastPropValue: T;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getMappingKey(mapping: MidiMapping<ModuleType>) {
  return [
    mapping.cc ?? "",
    mapping.moduleId ?? "",
    mapping.moduleType ?? "",
    mapping.propName ?? "",
    mapping.mode ?? "",
  ].join(":");
}

function getStepPrecision(step: number) {
  const exponentMatch = `${step}`.match(/e-(\d+)$/);
  if (exponentMatch) {
    return Number(exponentMatch[1]);
  }

  const decimalPart = `${step}`.split(".")[1];
  return decimalPart?.length ?? 0;
}

function quantizeNumberValue(value: number, propSchema: NumberProp): number {
  const { min, max } = propSchema;
  const clampedValue = clampNumber(value, min, max);
  const step = propSchema.step;

  if (step === undefined || step <= 0) {
    return clampedValue;
  }

  const steps = Math.round((clampedValue - min) / step);
  const precision = getStepPrecision(step);
  const quantizedValue = Number((min + steps * step).toFixed(precision));

  return clampNumber(quantizedValue, min, max);
}

function getNormalizedNumberValue(
  value: number,
  propSchema: NumberProp,
): number {
  const { min, max } = propSchema;

  if (max === min) {
    return 0;
  }

  const normalizedValue = (clampNumber(value, min, max) - min) / (max - min);
  return Math.pow(
    clampNumber(normalizedValue, 0, 1),
    1 / (propSchema.exp ?? 1),
  );
}

function mapNormalizedToNumberValue(
  normalizedValue: number,
  propSchema: NumberProp,
): number {
  const { min, max } = propSchema;

  if (max === min) {
    return min;
  }

  const curvedValue = Math.pow(
    clampNumber(normalizedValue, 0, 1),
    propSchema.exp ?? 1,
  );

  return quantizeNumberValue(min + curvedValue * (max - min), propSchema);
}

function getRelativeDelta(
  midiValue: number,
  mapping: MidiMapping<ModuleType>,
): number {
  const threshold = mapping.threshold ?? DEFAULT_RELATIVE_THRESHOLD;
  const rawDelta = midiValue - threshold;

  if (rawDelta === 0) {
    return 0;
  }

  return mapping.mode === MidiMappingMode.incDecRev ? -rawDelta : rawDelta;
}

function mapRelativeNumberValue({
  currentValue,
  propSchema,
  mapping,
  delta,
  relativeState,
}: {
  currentValue: number;
  propSchema: NumberProp;
  mapping: MidiMapping<ModuleType>;
  delta: number;
  relativeState?: RelativeNumberState;
}): { value: number; relativeState?: RelativeNumberState } {
  if (mapping.step !== undefined) {
    return {
      value: quantizeNumberValue(
        currentValue + delta * mapping.step,
        propSchema,
      ),
    };
  }

  if (propSchema.exp !== undefined && propSchema.exp !== 1) {
    const baseNormalizedValue =
      relativeState?.lastPropValue === currentValue
        ? relativeState.normalizedValue
        : getNormalizedNumberValue(currentValue, propSchema);
    const normalizedValue = clampNumber(
      baseNormalizedValue + delta / MIDI_MAX_VALUE,
      0,
      1,
    );
    const value = mapNormalizedToNumberValue(normalizedValue, propSchema);

    return {
      value,
      relativeState: {
        normalizedValue,
        lastPropValue: value,
      },
    };
  }

  if (propSchema.step !== undefined) {
    return {
      value: quantizeNumberValue(
        currentValue + delta * propSchema.step,
        propSchema,
      ),
    };
  }

  return {
    value: mapNormalizedToNumberValue(
      getNormalizedNumberValue(currentValue, propSchema) +
        delta / MIDI_MAX_VALUE,
      propSchema,
    ),
  };
}

function getRelativeEnumTicks(mapping: MidiMapping<ModuleType>) {
  if (mapping.step === undefined || !Number.isFinite(mapping.step)) {
    return DEFAULT_RELATIVE_ENUM_TICKS;
  }

  return Math.max(1, Math.round(mapping.step));
}

function mapRelativeEnumValue<T extends string | number>(
  currentValue: T,
  options: T[],
  delta: number,
  accumulatedDelta: number,
  ticksPerOption: number,
): { value: T; accumulatedDelta: number } {
  if (options.length === 0) {
    return { value: currentValue, accumulatedDelta: 0 };
  }

  const currentIndex = options.indexOf(currentValue);
  const baseIndex = currentIndex >= 0 ? currentIndex : 0;
  const totalDelta = accumulatedDelta + delta;
  const moveCount =
    totalDelta > 0
      ? Math.floor(totalDelta / ticksPerOption)
      : Math.ceil(totalDelta / ticksPerOption);

  if (moveCount === 0) {
    return {
      value: options[baseIndex] ?? currentValue,
      accumulatedDelta: totalDelta,
    };
  }

  const unclampedIndex = baseIndex + moveCount;
  const nextIndex = clampNumber(unclampedIndex, 0, options.length - 1);
  const appliedMoves = nextIndex - baseIndex;
  const hitBoundary = nextIndex !== unclampedIndex;

  return {
    value: options[nextIndex] ?? currentValue,
    accumulatedDelta: hitBoundary
      ? 0
      : totalDelta - appliedMoves * ticksPerOption,
  };
}

function mapRelativeBooleanValue(
  currentValue: boolean,
  delta: number,
): boolean {
  if (delta === 0) {
    return currentValue;
  }

  return delta > 0;
}

type MidiMapperSetterHooks = Pick<
  SetterHooks<IMidiMapperProps>,
  "onSetActiveTrack" | "onAfterSetTracks" | "onAfterSetGlobalMappings"
>;

export default class MidiMapper
  extends Module<ModuleType.MidiMapper>
  implements MidiMapperSetterHooks
{
  declare audioNode: undefined;
  private _midiOut: MidiOutput; // Will be used to send CC values on track change
  private readonly syncValues: MidiMapperSyncValues;
  private readonly relativeNumberState = new Map<string, RelativeNumberState>();
  private readonly relativeEnumState = new Map<
    string,
    RelativeEnumState<string | number>
  >();

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
    this.syncValues = new MidiMapperSyncValues(this.engine);

    // Defer initial sync so patch-load routes can be connected first.
    queueMicrotask(() => {
      this.syncControllerValues();
    });
  }

  onSetActiveTrack: MidiMapperSetterHooks["onSetActiveTrack"] = (value) => {
    const activeTrack = Math.max(
      Math.min(value, this.props.tracks.length - 1),
      0,
    );
    this.resetRelativeState();

    queueMicrotask(() => {
      this.syncControllerValues();
    });

    return activeTrack;
  };

  onAfterSetTracks: MidiMapperSetterHooks["onAfterSetTracks"] = () => {
    this.resetRelativeState();
    queueMicrotask(() => {
      this.syncControllerValues();
    });
  };

  onAfterSetGlobalMappings: MidiMapperSetterHooks["onAfterSetGlobalMappings"] =
    () => {
      this.resetRelativeState();
      queueMicrotask(() => {
        this.syncControllerValues();
      });
    };

  syncControllerValues = (moduleId?: string) => {
    const ccValues = this.syncValues.collectCCValues(this.props, moduleId);

    const now = this.context.currentTime;

    ccValues.forEach((value, cc) => {
      const event = MidiEvent.fromCC(cc, value, now);
      this._midiOut.onMidiEvent(event);
    });
  };

  handleCC = (event: MidiEvent, triggeredAt: ContextTime) => {
    this.checkAutoAssign(event);

    const activeTrack = this.props.tracks[this.props.activeTrack];
    if (!activeTrack) return;

    const matchingMappings = [
      ...this.props.globalMappings.filter((m) => m.cc === event.cc),
      ...activeTrack.mappings.filter((m) => m.cc === event.cc),
    ];

    // Forward all matching mappings
    matchingMappings.forEach((mapping) => {
      this.forwardMapping(event, mapping, triggeredAt);
    });
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

    const mode = mapping.mode;
    const isRelativeMode =
      mode === MidiMappingMode.incDec || mode === MidiMappingMode.incDecRev;
    const relativeDelta = isRelativeMode
      ? getRelativeDelta(midiValue, mapping)
      : undefined;

    // Toggle mode: only respond to 127 (button press), ignore 0
    if (
      (mode === MidiMappingMode.toggleInc ||
        mode === MidiMappingMode.toggleDec) &&
      midiValue !== 127
    ) {
      return;
    }

    if (isRelativeMode && relativeDelta === 0) {
      return;
    }

    const mappingKey = getMappingKey(mapping);
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

        if (relativeDelta !== undefined) {
          const result = mapRelativeNumberValue({
            currentValue,
            propSchema,
            mapping,
            delta: relativeDelta,
            relativeState: this.relativeNumberState.get(mappingKey),
          });
          mappedValue = result.value;

          if (result.relativeState) {
            this.relativeNumberState.set(mappingKey, result.relativeState);
          } else {
            this.relativeNumberState.delete(mappingKey);
          }
        } else if (mode === MidiMappingMode.directRev) {
          midiValue = 127 - midiValue;
        }

        if (mode === MidiMappingMode.toggleInc) {
          mappedValue = quantizeNumberValue(
            currentValue + (propSchema.step ?? 1),
            propSchema,
          );
        } else if (mode === MidiMappingMode.toggleDec) {
          mappedValue = quantizeNumberValue(
            currentValue - (propSchema.step ?? 1),
            propSchema,
          );
        } else if (mappedValue === undefined) {
          const { min, max } = propSchema;
          const normalizedMidi = midiValue / MIDI_MAX_VALUE;
          const curvedValue = Math.pow(normalizedMidi, propSchema.exp ?? 1);
          mappedValue = quantizeNumberValue(
            min + curvedValue * (max - min),
            propSchema,
          );
        }

        break;
      }
      case "enum": {
        if (relativeDelta !== undefined) {
          // @ts-expect-error TS7053 ignore this error
          const currentValue = mappedModule.props[propName] as string | number;
          const relativeState = this.relativeEnumState.get(mappingKey);
          const result = mapRelativeEnumValue(
            currentValue,
            propSchema.options,
            relativeDelta,
            relativeState?.lastPropValue === currentValue
              ? relativeState.accumulatedDelta
              : 0,
            getRelativeEnumTicks(mapping),
          );
          const nextEnumValue = result.value;
          mappedValue = nextEnumValue;
          this.relativeEnumState.set(mappingKey, {
            accumulatedDelta: result.accumulatedDelta,
            lastPropValue: nextEnumValue,
          });
        } else {
          const optionIndex = Math.floor(
            (midiValue / MIDI_MAX_VALUE) * propSchema.options.length,
          );
          const clampedIndex = Math.min(
            optionIndex,
            propSchema.options.length - 1,
          );
          mappedValue = propSchema.options[clampedIndex];
        }
        break;
      }
      case "boolean": {
        if (relativeDelta !== undefined) {
          // @ts-expect-error TS7053 ignore this error
          const currentValue = mappedModule.props[propName] as boolean;
          mappedValue = mapRelativeBooleanValue(currentValue, relativeDelta);
        } else {
          mappedValue = midiValue >= DEFAULT_RELATIVE_THRESHOLD;
        }
        break;
      }
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

  private resetRelativeState() {
    this.relativeNumberState.clear();
    this.relativeEnumState.clear();
  }

  private checkAutoAssign(event: MidiEvent) {
    if (event.cc === undefined) return;

    const activeTrack = this.props.tracks[this.props.activeTrack];
    if (!activeTrack) return;

    const hasGlobalAutoAssign = this.props.globalMappings.some(
      ({ autoAssign }) => autoAssign,
    );
    const hasTrackAutoAssign = activeTrack.mappings.some(
      ({ autoAssign }) => autoAssign,
    );

    if (!hasGlobalAutoAssign && !hasTrackAutoAssign) return;

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

    // Update track mappings if needed
    const updatedTrackMappings = hasTrackAutoAssign
      ? activeTrack.mappings.map((mapping) => {
          if (!mapping.autoAssign) return mapping;

          return {
            ...mapping,
            cc: event.cc,
            autoAssign: false,
          };
        })
      : activeTrack.mappings;

    const updatedTracks = this.props.tracks.map((track, index) =>
      index === this.props.activeTrack
        ? { ...track, mappings: updatedTrackMappings }
        : track,
    );

    this.props = {
      tracks: updatedTracks,
      globalMappings: updatedGlobalMappings,
    };
    this.triggerPropsUpdate();
  }
}
