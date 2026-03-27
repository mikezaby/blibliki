import { BPM } from "@blibliki/transport";
import { IModule, Module, ModulePropSchema, SetterHooks } from "@/core";
import { ICreateModule, ModuleType } from ".";

export type ITransportControl = IModule<ModuleType.TransportControl>;
export type ITransportControlProps = {
  bpm: BPM;
  swing: number;
};

const MIN_SWING = 0;
const MAX_SWING = 1;
const TRANSPORT_SWING_MIN = 0.5;
const TRANSPORT_SWING_MAX = 0.75;

const DEFAULT_PROPS: ITransportControlProps = {
  bpm: 120,
  swing: 0,
};

export const transportControlPropSchema: ModulePropSchema<ITransportControlProps> =
  {
    bpm: {
      kind: "number",
      min: 1,
      max: 999,
      step: 1,
      label: "BPM",
    },
    swing: {
      kind: "number",
      min: MIN_SWING,
      max: MAX_SWING,
      step: 0.01,
      label: "Swing",
    },
  };

function toTransportSwingAmount(value: number) {
  const clampedValue = Math.max(MIN_SWING, Math.min(MAX_SWING, value));

  return (
    TRANSPORT_SWING_MIN +
    clampedValue * (TRANSPORT_SWING_MAX - TRANSPORT_SWING_MIN)
  );
}

export default class TransportControl
  extends Module<ModuleType.TransportControl>
  implements
    Pick<
      SetterHooks<ITransportControlProps>,
      "onAfterSetBpm" | "onAfterSetSwing"
    >
{
  declare audioNode: undefined;

  constructor(
    engineId: string,
    params: ICreateModule<ModuleType.TransportControl>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    super(engineId, {
      ...params,
      props,
    });

    this.engine.transport.bpm = props.bpm;
    this.engine.transport.swingAmount = toTransportSwingAmount(props.swing);
  }

  onAfterSetBpm: SetterHooks<ITransportControlProps>["onAfterSetBpm"] = (
    value,
  ) => {
    this.engine.transport.bpm = value;
  };

  onAfterSetSwing: SetterHooks<ITransportControlProps>["onAfterSetSwing"] = (
    value,
  ) => {
    this.engine.transport.swingAmount = toTransportSwingAmount(value);
  };
}
