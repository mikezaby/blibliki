import { Button } from "@blibliki/ui";
import { ChangeEvent, useMemo } from "react";

type SliderProps = {
  min: number;
  max: number;
  value?: number;
  displayValue?: number;
  defaultValue?: number;
  step?: number;
  marks?: readonly MarkProps[];
  hideMarks?: boolean;
  orientation?: TOrientation;
  onChange: (newValue: number) => void;
};

export type TOrientation = "vertical" | "horizontal";

const InputClassName =
  "bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg appearance-none cursor-pointer transition-all duration-200 border border-slate-300 dark:border-slate-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none slider-custom";

type MarkProps = {
  value: number;
  label: string;
};

const Tooltip = ({ value }: { value: MarkProps | number | undefined }) => {
  return (
    <div className="absolute right-full hidden group-hover:block rounded bg-primary px-2 py-1 mx-2 text-primary-foreground text-xs ">
      <div className="rounded bg-primary px-2 py-1 text-primary-foreground text-xs">
        {typeof value === "object" ? value.label : value?.toFixed(2)}
      </div>
    </div>
  );
};

export default function Slider(props: SliderProps) {
  const {
    min,
    max,
    value,
    displayValue,
    defaultValue,
    marks,
    hideMarks = false,
    onChange,
    step = 0.01,
    orientation = "horizontal",
  } = props;

  const wrapperClassName = useMemo(() => {
    const rules = ["flex", "gap-x-2", "nodrag", "relative", "group"];

    if (orientation === "horizontal") rules.push("flex-col w-full");

    return rules.join(" ");
  }, [orientation]);

  const showTooltip = hideMarks || !marks?.some((m) => m.value);

  const inputClassName = useMemo(() => {
    return orientation === "horizontal"
      ? InputClassName
      : `${InputClassName} slider-vertical`;
  }, [orientation]);

  const _onChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(Number(event.target.value));
  };

  const showMarkValue =
    value && marks && marks.length > 1 && marks.some((m) => !!m.label);
  const displayedValue = showMarkValue ? marks[value] : (displayValue ?? value);

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
      {showTooltip && <Tooltip value={displayedValue} />}

      <Labels
        marks={hideMarks ? undefined : marks}
        orientation={orientation}
        onClick={onChange}
      />
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
        <Button
          key={index}
          size="sm"
          variant="text"
          color="secondary"
          className="h-auto px-1.5 py-1"
          onClick={_onClick(mark.value)}
        >
          <div className="w-1 h-1 bg-linear-to-br from-blue-500 to-purple-600 rounded-full" />
          {mark.label}
        </Button>
      ))}
    </div>
  );
}
