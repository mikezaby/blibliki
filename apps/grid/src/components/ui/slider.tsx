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

// Custom slider styles for cross-browser consistency
const sliderStyles = `
  /* WebKit browsers (Chrome, Safari, Edge) */
  .slider-custom::-webkit-slider-thumb {
    appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    border: 2px solid white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3), 0 1px 3px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .slider-custom::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4), 0 2px 6px rgba(0, 0, 0, 0.15);
  }
  
  .slider-custom::-webkit-slider-thumb:active {
    transform: scale(0.95);
  }
  
  /* Dark mode for WebKit */
  .dark .slider-custom::-webkit-slider-thumb {
    border-color: #1e293b;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  
  .dark .slider-custom::-webkit-slider-thumb:hover {
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5), 0 2px 6px rgba(0, 0, 0, 0.4);
  }
  
  /* Firefox */
  .slider-custom::-moz-range-thumb {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    border: 2px solid white;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3), 0 1px 3px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .slider-custom::-moz-range-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4), 0 2px 6px rgba(0, 0, 0, 0.15);
  }
  
  .slider-custom::-moz-range-thumb:active {
    transform: scale(0.95);
  }
  
  /* Dark mode for Firefox */
  .dark .slider-custom::-moz-range-thumb {
    border-color: #1e293b;
    box-shadow: 0 2px 8px rgba(59, 130, 246, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3);
  }
  
  .dark .slider-custom::-moz-range-thumb:hover {
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5), 0 2px 6px rgba(0, 0, 0, 0.4);
  }
  
  /* Vertical slider specific styles */
  .slider-vertical::-webkit-slider-thumb {
    width: 20px;
    height: 20px;
  }
  
  .slider-vertical::-moz-range-thumb {
    width: 20px;
    height: 20px;
  }
`;

// Inject styles into the document head
if (typeof document !== 'undefined' && !document.getElementById('slider-custom-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'slider-custom-styles';
  styleElement.textContent = sliderStyles;
  document.head.appendChild(styleElement);
}

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
      className={`flex ${labelDirection} ${justify} text-slate-700 dark:text-slate-300 gap-1`}
    >
      {marks.map((mark, index) => (
        <button
          key={index}
          className="flex items-center gap-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors px-1.5 py-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
          onClick={_onClick(mark.value)}
        >
          <div className="w-1 h-1 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full" />
          {mark.label}
        </button>
      ))}
    </div>
  );
}
