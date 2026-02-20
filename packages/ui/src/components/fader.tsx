import { throttle } from "@blibliki/utils";
import { ChangeEvent } from "react";
import { cn } from "@/lib/cn";
import { Button } from "./button";

export type TOrientation = "vertical" | "horizontal";

export type MarkProps = {
  value: number;
  label: string;
};

export interface FaderProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  name: string;
  onChange: (value: number, calculatedValue: number) => void;
  defaultValue?: number;
  value?: number;
  orientation?: TOrientation;
  marks?: readonly MarkProps[];
  hideMarks?: boolean;
  max?: number;
  min?: number;
  step?: number;
  exp?: number;
}

const calcValue = (
  sliderValue: number,
  min: number,
  max: number,
  exp?: number,
) => {
  if (exp === undefined || exp === 1) return sliderValue;

  const range = max - min;
  if (range === 0) return min;
  const normalizedSlider = (sliderValue - min) / range;
  const curved = Math.pow(normalizedSlider, exp);

  return min + curved * range;
};

const revCalcValue = (
  actualValue: number,
  min: number,
  max: number,
  exp?: number,
) => {
  if (exp === undefined || exp === 1) return actualValue;

  const range = max - min;
  if (range === 0) return min;
  const normalizedValue = (actualValue - min) / range;
  const inverseExp = 1 / exp;
  const sliderPosition = Math.pow(normalizedValue, inverseExp);

  return min + sliderPosition * range;
};

function formatTooltipValue(value?: number) {
  if (value === undefined) return "";
  if (Number.isInteger(value)) return `${value}`;
  return value.toFixed(2);
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

function Fader(props: FaderProps) {
  const {
    className,
    name,
    onChange,
    value,
    defaultValue,
    marks,
    hideMarks = false,
    exp,
    min = 0,
    orientation = "vertical",
    max: maxProp,
    step: stepProp,
    ...rest
  } = props;

  const marksCount = marks?.length ?? 0;
  const hasMarkedScale = marksCount > 0;
  const max = maxProp ?? (hasMarkedScale ? marksCount - 1 : 1);
  const step = stepProp ?? (hasMarkedScale ? 1 : 0.01);

  const sliderValue =
    value !== undefined
      ? clamp(revCalcValue(value, min, max, exp), min, max)
      : undefined;
  const sliderDefaultValue =
    defaultValue !== undefined ? clamp(defaultValue, min, max) : min;

  const onRangeChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextSliderValue = clamp(Number(event.target.value), min, max);
    onChange(nextSliderValue, calcValue(nextSliderValue, min, max, exp));
  };
  const debouncedOnChange = throttle(onRangeChange, 1000);

  const onMarkClick = (markValue: number) => () => {
    const nextSliderValue = clamp(markValue, min, max);
    onChange(nextSliderValue, calcValue(nextSliderValue, min, max, exp));
  };
  const getHorizontalMarkPosition = (markValue: number) => {
    if (max === min) return 0;
    return ((clamp(markValue, min, max) - min) / (max - min)) * 100;
  };

  const hasOnlyZeroMarks = marks
    ? marks.every((mark) => mark.value === 0)
    : false;
  const showTooltip = hideMarks || !marks || hasOnlyZeroMarks;
  const currentSliderValue = sliderValue ?? sliderDefaultValue;
  const activeMark = marks?.find((mark) => mark.value === currentSliderValue);
  const currentDisplayValue =
    value ?? calcValue(currentSliderValue, min, max, exp);
  const tooltipText =
    activeMark?.label ?? formatTooltipValue(currentDisplayValue);

  const rangeValueProps =
    sliderValue !== undefined
      ? ({ value: sliderValue } as const)
      : ({ defaultValue: sliderDefaultValue } as const);

  return (
    <div
      className={cn(
        "ui-fader nodrag",
        orientation === "horizontal" && "ui-fader--horizontal",
        className,
      )}
      {...rest}
    >
      <div
        className={cn(
          "ui-fader__control",
          orientation === "horizontal"
            ? "ui-fader__control--horizontal"
            : "ui-fader__control--vertical",
        )}
      >
        <input
          type="range"
          min={min}
          max={max}
          {...rangeValueProps}
          step={step}
          aria-label={name}
          className={cn(
            "ui-fader__range",
            orientation === "horizontal"
              ? "ui-fader__range--horizontal"
              : "ui-fader__range--vertical",
          )}
          onChange={debouncedOnChange}
        />

        {showTooltip && (
          <div
            className={cn(
              "ui-fader__tooltip",
              orientation === "horizontal"
                ? "ui-fader__tooltip--horizontal"
                : "ui-fader__tooltip--vertical",
            )}
          >
            {tooltipText}
          </div>
        )}

        {marks && !hideMarks && (
          <div
            className={cn(
              "ui-fader__marks",
              orientation === "horizontal"
                ? "ui-fader__marks--horizontal"
                : "ui-fader__marks--vertical",
              marks.length === 1 && "ui-fader__marks--single",
            )}
          >
            {marks.map((mark, index) => (
              <Button
                key={`${mark.value}-${index}`}
                size="sm"
                variant="text"
                color="secondary"
                className={cn(
                  "ui-fader__mark-button",
                  orientation === "horizontal" &&
                    "ui-fader__mark-button--horizontal",
                  orientation === "horizontal" &&
                    mark.value <= min &&
                    "ui-fader__mark-button--horizontal-start",
                  orientation === "horizontal" &&
                    mark.value >= max &&
                    "ui-fader__mark-button--horizontal-end",
                )}
                style={
                  orientation === "horizontal"
                    ? { left: `${getHorizontalMarkPosition(mark.value)}%` }
                    : undefined
                }
                onClick={onMarkClick(mark.value)}
              >
                <span className="ui-fader__mark-dot" aria-hidden />
                {mark.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      <div className="ui-fader__label-row">
        <span className="ui-fader__label-dot" aria-hidden />
        <span className="ui-fader__label">{name}</span>
      </div>
    </div>
  );
}

Fader.displayName = "Fader";

export { Fader };
