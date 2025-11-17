import { moduleSchemas, ModuleType } from "@blibliki/engine";
import Fader from "@/components/Fader";

type ResonanceProps = {
  value: number;
  updateProp: (value: number) => void;
};

export default function Resonance(props: ResonanceProps) {
  const { value, updateProp } = props;

  const onChange = (_: number, calcValue: number) => {
    updateProp(calcValue);
  };

  return (
    <Fader
      name="Q"
      min={moduleSchemas[ModuleType.Filter].Q.min}
      max={moduleSchemas[ModuleType.Filter].Q.max}
      exp={moduleSchemas[ModuleType.Filter].Q.exp}
      onChange={onChange}
      value={value}
    />
  );
}
