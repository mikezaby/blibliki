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
      min={0}
      max={22050}
      onChange={onChange}
      value={value}
      exp={4}
    />
  );
}
