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
      min={0}
      max={1000}
      onChange={onChange}
      value={value}
      exp={5}
    />
  );
}
