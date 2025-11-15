import Fader from "@/components/Fader";

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
      min={20}
      max={20000}
      onChange={onChange}
      value={value}
      exp={5}
    />
  );
}
