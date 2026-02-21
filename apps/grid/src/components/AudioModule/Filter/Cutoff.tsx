import { moduleSchemas, ModuleType } from "@blibliki/engine";
import { Fader } from "@blibliki/ui";

type CutoffProps = {
  value: number;
  updateProp: (value: number) => void;
};

export default function Cutoff(props: CutoffProps) {
  const { value, updateProp } = props;

  const onChange = (_: number, calcValue: number) => {
    updateProp(calcValue);
  };

  return (
    <Fader
      name="Hz"
      min={moduleSchemas[ModuleType.Filter].cutoff.min}
      max={moduleSchemas[ModuleType.Filter].cutoff.max}
      onChange={onChange}
      value={value}
      exp={moduleSchemas[ModuleType.Filter].cutoff.exp}
    />
  );
}
