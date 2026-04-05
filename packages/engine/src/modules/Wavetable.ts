import { ContextTime } from "@blibliki/transport";
import { Context, dbToGain } from "@blibliki/utils";
import { GainNode } from "@blibliki/utils/web-audio-api";
import { IModule, Module } from "@/core";
import Note from "@/core/Note";
import { IModuleConstructor, SetterHooks } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { ModulePropSchema } from "@/core/schema";
import { CustomWorklet, newAudioWorklet } from "@/processors";
import { ICreateModule, ModuleType } from ".";
import {
  DEFAULT_WAVETABLE_TABLES,
  sanitizeWavetableTables,
} from "./WavetablePeriodicWaveFactory";

const LOW_GAIN = -18;
const POSITION_MODULATION_SCALE = 0.5;
const POSITION_STATE_EPSILON = 0.0005;
const SET_TABLES_MESSAGE = "setTables";
const ACTUAL_POSITION_MESSAGE = "actualPosition";

export type IWavetable = IModule<ModuleType.Wavetable>;
export type IWavetableDefinition = {
  real: number[];
  imag: number[];
};

export type IWavetableState = {
  actualPosition: number;
};

export type IWavetableTable = {
  real: number[];
  imag: number[];
};

export type IWavetableConfig = {
  tables: IWavetableTable[];
};

export type IWavetableProps = {
  tables: IWavetableTable[];
  position: number;
  frequency: number;
  fine: number;
  coarse: number;
  octave: number;
  lowGain: boolean;
};

export const wavetablePropSchema: ModulePropSchema<IWavetableProps> = {
  tables: {
    kind: "array",
    label: "Tables",
    shortLabel: "tbls",
  },
  position: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.001,
    label: "Position",
    shortLabel: "pos",
  },
  frequency: {
    kind: "number",
    min: 0,
    max: 25000,
    step: 1,
    label: "Frequency",
    shortLabel: "freq",
  },
  fine: {
    kind: "number",
    min: -1,
    max: 1,
    step: 0.01,
    label: "Fine",
    shortLabel: "fine",
  },
  coarse: {
    kind: "number",
    min: -12,
    max: 12,
    step: 1,
    label: "Coarse",
    shortLabel: "crs",
  },
  octave: {
    kind: "number",
    min: -1,
    max: 2,
    step: 1,
    label: "Octave",
    shortLabel: "oct",
  },
  lowGain: {
    kind: "boolean",
    label: `Use ${LOW_GAIN}db Gain`,
    shortLabel: "low",
  },
};

const NUMBER_PATTERN = /-?\d*\.?\d+(?:e[+-]?\d+)?/gi;

const parseNumberArray = (arraySource: string): number[] => {
  const matches = arraySource.match(NUMBER_PATTERN);
  if (!matches) return [];

  return matches.map(Number).filter(Number.isFinite);
};

const extractArrayByKey = (source: string, key: "real" | "imag") => {
  const pattern = new RegExp(
    `["']?${key}["']?\\s*:\\s*\\[([\\s\\S]*?)\\]`,
    "i",
  );
  const match = source.match(pattern);
  if (!match) return undefined;

  return parseNumberArray(match[1] ?? "");
};

export const parseWavetableDefinition = (
  source: string,
): IWavetableDefinition => {
  const real = extractArrayByKey(source, "real");
  const imag = extractArrayByKey(source, "imag");

  if (!real || !imag) {
    throw new Error(
      "Wavetable definition must include both real and imag arrays",
    );
  }

  return {
    real,
    imag,
  };
};

export const formatWavetableDefinition = (
  definition: IWavetableDefinition,
): string => {
  const { real, imag } = definition;
  return JSON.stringify({ real, imag }, null, 2);
};

const TABLE_PATTERN =
  /["']?real["']?\s*:\s*\[([\s\S]*?)\]\s*,?\s*["']?imag["']?\s*:\s*\[([\s\S]*?)\]/gi;

export const parseWavetableConfig = (source: string): IWavetableConfig => {
  const tables: IWavetableTable[] = [];
  TABLE_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null = TABLE_PATTERN.exec(source);

  while (match) {
    const real = parseNumberArray(match[1] ?? "");
    const imag = parseNumberArray(match[2] ?? "");
    tables.push({ real, imag });
    match = TABLE_PATTERN.exec(source);
  }

  if (!tables.length) {
    throw new Error(
      "Wavetable config must include at least one table with real and imag arrays",
    );
  }

  return { tables };
};

export const formatWavetableConfig = (config: IWavetableConfig): string => {
  return JSON.stringify({ tables: config.tables }, null, 2);
};

const DEFAULT_TABLES: IWavetableTable[] = DEFAULT_WAVETABLE_TABLES.map(
  (table) => ({ real: [...table.real], imag: [...table.imag] }),
);

const DEFAULT_PROPS: IWavetableProps = {
  tables: DEFAULT_TABLES,
  position: 0,
  frequency: 440,
  fine: 0,
  coarse: 0,
  octave: 0,
  lowGain: false,
};

type WavetableSetterHooks = Pick<
  SetterHooks<IWavetableProps>,
  | "onSetPosition"
  | "onAfterSetTables"
  | "onAfterSetPosition"
  | "onAfterSetFrequency"
  | "onAfterSetFine"
  | "onAfterSetCoarse"
  | "onAfterSetOctave"
  | "onAfterSetLowGain"
>;

type PolyWavetableSetterHooks = Pick<
  SetterHooks<IWavetableProps>,
  "onSetTables"
>;

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(max, Math.max(min, value));
};

const transposeFrequency = ({
  frequency,
  coarse,
  octave,
  fine,
}: Pick<
  IWavetableProps,
  "frequency" | "coarse" | "octave" | "fine"
>): number => {
  return frequency * Math.pow(2, coarse / 12 + octave + fine / 12);
};

type WavetableProcessorMessage = {
  type: string;
  value?: unknown;
};

export class MonoWavetable
  extends Module<ModuleType.Wavetable>
  implements WavetableSetterHooks
{
  declare audioNode: AudioWorkletNode;
  private isStarted = false;
  private outputGain: GainNode;
  private detuneGain: GainNode;
  private positionModulationGain: GainNode;

  constructor(engineId: string, params: ICreateModule<ModuleType.Wavetable>) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    const audioNodeConstructor = (context: Context) => {
      const node = newAudioWorklet(context, CustomWorklet.WavetableProcessor);
      node.parameters.get("frequency")!.value = transposeFrequency(props);
      node.parameters.get("detune")!.value = 0;
      node.parameters.get("position")!.value = clamp(props.position, 0, 1);
      node.parameters.get("active")!.value = 0;
      return node;
    };

    super(engineId, {
      ...params,
      props,
      audioNodeConstructor,
    });

    this.outputGain = new GainNode(this.context.audioContext, {
      gain: props.lowGain ? dbToGain(LOW_GAIN) : 1,
    });
    this.detuneGain = new GainNode(this.context.audioContext, {
      gain: 100,
    });
    this.positionModulationGain = new GainNode(this.context.audioContext, {
      gain: POSITION_MODULATION_SCALE,
    });

    this.audioNode.connect(this.outputGain);
    this.detuneGain.connect(this.detuneParam);
    this.positionModulationGain.connect(this.positionParam);

    this.audioNode.port.onmessage = this.onProcessorMessage;
    this.sendTablesToProcessor(this.props.tables);
    this.updateFrequency();
    this.registerInputs();
    this.registerOutputs();
  }

  onSetPosition: WavetableSetterHooks["onSetPosition"] = (value) => {
    return clamp(value, 0, 1);
  };

  onAfterSetTables: WavetableSetterHooks["onAfterSetTables"] = (tables) => {
    this.sendTablesToProcessor(tables);
  };

  onAfterSetPosition: WavetableSetterHooks["onAfterSetPosition"] = (value) => {
    this.positionParam.value = value;
    if (!this.isStarted) {
      this.parentModule?.setActualPosition(value, this.voiceNo);
    }
  };

  onAfterSetFrequency: WavetableSetterHooks["onAfterSetFrequency"] = () => {
    this.updateFrequency();
  };

  onAfterSetFine: WavetableSetterHooks["onAfterSetFine"] = () => {
    this.updateFrequency();
  };

  onAfterSetCoarse: WavetableSetterHooks["onAfterSetCoarse"] = () => {
    this.updateFrequency();
  };

  onAfterSetOctave: WavetableSetterHooks["onAfterSetOctave"] = () => {
    this.updateFrequency();
  };

  onAfterSetLowGain: WavetableSetterHooks["onAfterSetLowGain"] = (lowGain) => {
    this.outputGain.gain.value = lowGain ? dbToGain(LOW_GAIN) : 1;
  };

  start(time: ContextTime) {
    if (this.isStarted) return;

    this.activeParam.setValueAtTime(1, time);
    this.isStarted = true;
  }

  stop(time: ContextTime) {
    if (!this.isStarted) return;

    this.activeParam.setValueAtTime(0, time);
    this.isStarted = false;
  }

  triggerAttack = (note: Note, triggeredAt: ContextTime) => {
    super.triggerAttack(note, triggeredAt);

    this._props.frequency = note.frequency;
    this.updateFrequency(triggeredAt);
    this.start(triggeredAt);
  };

  triggerRelease(note: Note, triggeredAt: ContextTime) {
    super.triggerRelease(note, triggeredAt);

    const lastNote = this.activeNotes.length
      ? this.activeNotes[this.activeNotes.length - 1]
      : null;
    if (!lastNote) return;

    this._props.frequency = lastNote.frequency;
    this.updateFrequency(triggeredAt);
  }

  override dispose(): void {
    this.audioNode.port.onmessage = null;
    super.dispose();
  }

  private get finalFrequency(): number {
    return transposeFrequency(this.props);
  }

  private get frequencyParam() {
    return this.audioNode.parameters.get("frequency")!;
  }

  private get detuneParam() {
    return this.audioNode.parameters.get("detune")!;
  }

  private get positionParam() {
    return this.audioNode.parameters.get("position")!;
  }

  private get activeParam() {
    return this.audioNode.parameters.get("active")!;
  }

  private updateFrequency(actionAt?: ContextTime) {
    if (actionAt) {
      this.frequencyParam.setValueAtTime(this.finalFrequency, actionAt);
      return;
    }

    this.frequencyParam.value = this.finalFrequency;
  }

  private sendTablesToProcessor(tables: IWavetableTable[]) {
    this.audioNode.port.postMessage({
      type: SET_TABLES_MESSAGE,
      tables: sanitizeWavetableTables(tables),
    });
  }

  private onProcessorMessage = (event: MessageEvent<unknown>) => {
    const data = event.data;
    if (!data || typeof data !== "object") return;

    const message = data as WavetableProcessorMessage;
    if (message.type !== ACTUAL_POSITION_MESSAGE) return;
    if (typeof message.value !== "number") return;

    this.parentModule?.setActualPosition(message.value, this.voiceNo);
  };

  private registerInputs() {
    this.registerAudioInput({
      name: "detune",
      getAudioNode: () => this.detuneGain,
    });

    this.registerAudioInput({
      name: "position",
      getAudioNode: () => this.positionModulationGain,
    });
  }

  private registerOutputs() {
    this.registerAudioOutput({
      name: "out",
      getAudioNode: () => this.outputGain,
    });
  }
}

export default class Wavetable
  extends PolyModule<ModuleType.Wavetable>
  implements PolyWavetableSetterHooks
{
  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.Wavetable>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.Wavetable>,
    ) => Module.create(MonoWavetable, engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this._state = { actualPosition: clamp(props.position, 0, 1) };

    this.registerInputs();
    this.registerDefaultIOs("out");
  }

  onSetTables: PolyWavetableSetterHooks["onSetTables"] = (tables) => {
    return sanitizeWavetableTables(tables);
  };

  start(time: ContextTime) {
    this.audioModules.forEach((audioModule) => {
      audioModule.start(time);
    });
  }

  stop(time: ContextTime) {
    this.audioModules.forEach((audioModule) => {
      audioModule.stop(time);
    });
  }

  setActualPosition(position: number, voiceNo: number) {
    if (voiceNo !== 0) return;

    const actualPosition = clamp(position, 0, 1);
    if (
      Math.abs(this._state.actualPosition - actualPosition) <
      POSITION_STATE_EPSILON
    ) {
      return;
    }

    this._state = {
      ...this._state,
      actualPosition,
    };

    this.triggerPropsUpdate();
  }

  private registerInputs() {
    this.registerAudioInput({ name: "detune" });
    this.registerAudioInput({ name: "position" });
  }
}
