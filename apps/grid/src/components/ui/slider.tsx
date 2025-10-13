import { ChangeEvent, useMemo } from "react";

type SliderProps = {
  min: number;
  max: number;
  value?: number;
  defaultValue?: number;
  step?: number;
  marks?: readonly MarkProps[];
  orientation?: TOrientation;
  onChange: (newValue: number) => void;
};

type TOrientation = "vertical" | "horizontal";

const InputClassName =
  "bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700";

type MarkProps = {
  value: number;
  label: string;
};

export default function Slider(props: SliderProps) {
  const {
    min,
    max,
    value,
    defaultValue,
    marks,
    onChange,
    step = 0.01,
    orientation = "horizontal",
  } = props;

  const wrapperClassName = useMemo(() => {
    const rules = ["flex", "gap-x-2", "nodrag"];

    if (orientation === "horizontal") rules.push("flex-col");

    return rules.join(" ");
  }, [orientation]);

  const inputClassName = useMemo(() => {
    return orientation === "horizontal"
      ? InputClassName
      : `${InputClassName} slider-vertical`;
  }, [orientation]);

  const _onChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value));
  };

  return (
    <div className={wrapperClassName}>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        defaultValue={defaultValue}
        step={step}
        className={inputClassName}
        onChange={_onChange}
      />

      <Labels marks={marks} orientation={orientation} onClick={onChange} />
    </div>
  );
}

function Labels({
  orientation,
  onClick,
  marks,
}: {
  orientation: TOrientation;
  onClick: (newValue: number) => void;
  marks?: readonly MarkProps[];
}) {
  if (!marks) return null;

  const labelDirection = orientation === "vertical" ? "flex-col-reverse" : "";
  const justify = marks.length === 1 ? "justify-center" : "justify-between";

  const _onClick = (value: number) => () => {
    onClick(value);
  };

  return (
    <div
      className={`flex ${labelDirection} ${justify} text-gray-900 dark:text-white`}
    >
      {marks.map((mark, index) => (
        <button key={index} className="text-xs" onClick={_onClick(mark.value)}>
          {mark.label}
        </button>
      ))}
    </div>
  );
}
