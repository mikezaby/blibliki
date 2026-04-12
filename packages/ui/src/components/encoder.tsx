import {
  forwardRef,
  type CSSProperties,
  type HTMLAttributes,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/cn";

type EncoderSize = "sm" | "md";

type DragState = {
  pointerId: number;
  startY: number;
  startSliderValue: number;
};

const FULL_RANGE_DRAG_DISTANCE_PX = 160;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const calcSliderValue = (
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

  return min + Math.pow(normalizedValue, inverseExp) * range;
};

const calcActualValue = (
  sliderValue: number,
  min: number,
  max: number,
  exp?: number,
) => {
  if (exp === undefined || exp === 1) return sliderValue;

  const range = max - min;
  if (range === 0) return min;

  const normalizedSlider = (sliderValue - min) / range;

  return min + Math.pow(normalizedSlider, exp) * range;
};

const getStepPrecision = (step: number) => {
  const stepString = `${step}`;
  const decimalIndex = stepString.indexOf(".");

  return decimalIndex === -1 ? 0 : stepString.length - decimalIndex - 1;
};

const roundToStep = (value: number, min: number, step: number) => {
  const precision = getStepPrecision(step);
  const nextValue = Math.round((value - min) / step) * step + min;

  return Number(nextValue.toFixed(precision));
};

const formatDisplayValue = (value: number, step: number) => {
  const precision = Math.min(4, getStepPrecision(step));

  if (precision === 0) return `${Math.round(value)}`;

  return `${Number(value.toFixed(precision))}`;
};

export interface EncoderProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "onChange"
> {
  name: string;
  onChange: (value: number) => void;
  defaultValue?: number;
  value?: number;
  max?: number;
  min?: number;
  step?: number;
  exp?: number;
  size?: EncoderSize;
  disabled?: boolean;
  formatValue?: (value: number) => string;
}

const Encoder = forwardRef<HTMLDivElement, EncoderProps>(
  (
    {
      className,
      style,
      name,
      onChange,
      value,
      defaultValue,
      max = 1,
      min = 0,
      step = 0.01,
      exp,
      size = "md",
      disabled = false,
      formatValue,
      onKeyDown,
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onWheel,
      ...rest
    },
    ref,
  ) => {
    const [uncontrolledValue, setUncontrolledValue] = useState(
      clamp(defaultValue ?? min, min, max),
    );
    const dragStateRef = useRef<DragState | null>(null);

    const currentValue = clamp(value ?? uncontrolledValue, min, max);
    const currentSliderValue = clamp(
      calcSliderValue(currentValue, min, max, exp),
      min,
      max,
    );

    const progress = max === min ? 0 : (currentSliderValue - min) / (max - min);

    const displayValue = formatValue
      ? formatValue(currentValue)
      : formatDisplayValue(currentValue, step);

    const commitValue = (nextRawValue: number) => {
      const nextValue = clamp(roundToStep(nextRawValue, min, step), min, max);

      if (nextValue === currentValue) return;

      if (value === undefined) {
        setUncontrolledValue(nextValue);
      }

      onChange(nextValue);
    };

    const changeBySteps = (stepDelta: number) => {
      commitValue(currentValue + stepDelta * step);
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(event);

      if (event.defaultPrevented || disabled) return;

      switch (event.key) {
        case "ArrowUp":
        case "ArrowRight":
          event.preventDefault();
          changeBySteps(1);
          return;
        case "ArrowDown":
        case "ArrowLeft":
          event.preventDefault();
          changeBySteps(-1);
          return;
        case "PageUp":
          event.preventDefault();
          changeBySteps(10);
          return;
        case "PageDown":
          event.preventDefault();
          changeBySteps(-10);
          return;
        case "Home":
          event.preventDefault();
          commitValue(min);
          return;
        case "End":
          event.preventDefault();
          commitValue(max);
          return;
        default:
          return;
      }
    };

    const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
      onPointerDown?.(event);

      if (event.defaultPrevented || disabled) return;

      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);

      dragStateRef.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startSliderValue: currentSliderValue,
      };
    };

    const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
      onPointerMove?.(event);

      if (event.defaultPrevented || disabled) return;

      const dragState = dragStateRef.current;

      if (dragState?.pointerId !== event.pointerId) return;

      event.preventDefault();

      const deltaSliderValue =
        ((dragState.startY - event.clientY) * (max - min)) /
        FULL_RANGE_DRAG_DISTANCE_PX;
      const nextSliderValue = clamp(
        dragState.startSliderValue + deltaSliderValue,
        min,
        max,
      );
      const nextValue = calcActualValue(nextSliderValue, min, max, exp);

      commitValue(nextValue);
    };

    const clearDragState = (event: PointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;

      if (dragState?.pointerId !== event.pointerId) return;

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      dragStateRef.current = null;
    };

    const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
      onPointerUp?.(event);

      if (event.defaultPrevented) return;

      clearDragState(event);
    };

    const handlePointerCancel = (event: PointerEvent<HTMLDivElement>) => {
      onPointerCancel?.(event);

      if (event.defaultPrevented) return;

      clearDragState(event);
    };

    const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
      onWheel?.(event);

      if (event.defaultPrevented || disabled || event.deltaY === 0) return;

      event.preventDefault();
      changeBySteps(event.deltaY < 0 ? 1 : -1);
    };

    return (
      <div
        ref={ref}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={name}
        aria-disabled={disabled}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={currentValue}
        aria-valuetext={displayValue}
        data-size={size}
        className={cn(
          "ui-encoder",
          size === "sm" && "ui-encoder--size-sm",
          size === "md" && "ui-encoder--size-md",
          disabled && "ui-encoder--disabled",
          className,
        )}
        style={
          {
            ...style,
            "--ui-encoder-angle": `${-135 + progress * 270}deg`,
            "--ui-encoder-fill": `${progress * 270}deg`,
          } as CSSProperties
        }
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onWheel={handleWheel}
        {...rest}
      >
        <div className="ui-encoder__dial">
          <span className="ui-encoder__indicator" aria-hidden />
          <span className="ui-encoder__value">{displayValue}</span>
        </div>
      </div>
    );
  },
);

Encoder.displayName = "Encoder";

export { Encoder };
