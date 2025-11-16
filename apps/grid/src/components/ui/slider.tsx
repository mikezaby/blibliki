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
  "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg appearance-none cursor-pointer transition-all duration-200 border border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none slider-custom";

type MarkProps = {
  value: number;
  label: string;
};

const Tooltip = ({ value }: { value: number | undefined }) => {
  return (
    <div className="absolute right-full hidden group-hover:block rounded bg-primary px-2 py-1 mx-2 text-primary-foreground text-xs ">
      <div className="rounded bg-primary px-2 py-1 text-primary-foreground text-xs">
        {value?.toFixed(2)}
      </div>
    </div>
  );
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
    const rules = ["flex", "gap-x-2", "nodrag", "relative", "group"];

    if (orientation === "horizontal") rules.push("flex-col");

    return rules.join(" ");
  }, [orientation]);

  const hasMarks = marks?.some((m) => m.value);

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
      {!hasMarks && <Tooltip value={value} />}

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
      className={`flex ${labelDirection} ${justify} text-slate-700 dark:text-slate-300 gap-1`}
    >
      {marks.map((mark, index) => (
        <button
          key={index}
          className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          onClick={_onClick(mark.value)}
        >
          <div className="w-1 h-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full" />
          {mark.label}
        </button>
      ))}
    </div>
  );
}
