import Fader from "@/components/Fader";

type FilterTypeProps = {
  value: BiquadFilterType;
  updateProp: (value: BiquadFilterType) => void;
}

const FILTER_TYPES = [
  { value: 0, label: "lowpass" },
  { value: 1, label: "highpass" },
  { value: 2, label: "bandpass" },
] as const;

export default function FilterType(props: FilterTypeProps) {
  const { value, updateProp } = props;

  const index = FILTER_TYPES.find((t) => t.label === value)?.value;

  const onChange = (value: number) => {
    const val =
      FILTER_TYPES.find((t) => t.value === value)?.label ??
      FILTER_TYPES[0].label;
    updateProp(val as BiquadFilterType);
  };

  return (
    <Fader name="Type" marks={FILTER_TYPES} onChange={onChange} value={index} />
  );
}
