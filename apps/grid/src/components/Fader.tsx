import { throttle } from "@blibliki/utils";
import { Slider } from "./ui";
import { TOrientation } from "./ui/slider";

export type MarkProps = {
  value: number;
  label: string;
};

type FaderProps = {
  name: string;
  onChange: (value: number, calculatedValue: number) => void;
  defaultValue?: number;
  value?: number;
  orientation?: TOrientation;
  marks?: readonly MarkProps[];
  max?: number;
  min?: number;
  step?: number;
  exp?: number;
};

const calcValue = function (
  sliderValue: number,
  min: number,
  max: number,
  exp?: number,
) {
  if (exp === undefined || exp === 1) return sliderValue;

  const range = max - min;
  const normalizedSlider = (sliderValue - min) / range; // 0 to 1
  const curved = Math.pow(normalizedSlider, exp);

  return min + curved * range;
};

const revCalcValue = function (
  actualValue: number,
  min: number,
  max: number,
  exp?: number,
) {
  if (exp === undefined || exp === 1) return actualValue;

  const range = max - min;
  const normalizedValue = (actualValue - min) / range; // 0 to 1
  const inverseExp = 1 / exp;
  const sliderPosition = Math.pow(normalizedValue, inverseExp);

  return min + sliderPosition * range;
};

export default function Fader(props: FaderProps) {
  const {
    name,
    onChange,
    value,
    defaultValue,
    marks,
    exp,
    min = 0,
    orientation = "vertical",
  } = props;

  let { max, step } = props;

  if (marks) {
    step ??= 1;
  }

  max ??= marks ? marks.length - 1 : 1;

  const revValue = value && revCalcValue(value, min, max, exp);

  const internalOnChange = (newValue: number) => {
    onChange(newValue, calcValue(newValue, min, max, exp));
  };
  const debouncedOnChange = throttle(internalOnChange, 500);

  return (
    <div className="flex flex-col items-center gap-2 p-2">
      <Slider
        orientation={orientation}
        onChange={debouncedOnChange}
        value={revValue}
        displayValue={value}
        defaultValue={defaultValue}
        min={min}
        max={max}
        step={step ?? 0.01}
        marks={marks}
      />

      <div className="flex items-center w-full gap-1.5 mt-1">
        <div className="w-1.5 h-1.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full" />
        <label className="text-xs font-medium text-slate-700 dark:text-slate-300 tracking-tight text-center">
          {name}
        </label>
      </div>
    </div>
  );
}
