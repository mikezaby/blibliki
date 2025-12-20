import { IPattern } from "@blibliki/engine";

type PatternSelectorProps = {
  patterns: IPattern[];
  activePatternNo: number;
  onPatternChange: (index: number) => void;
  onAddPattern: () => void;
  onDeletePattern: (index: number) => void;
};

export default function PatternSelector({
  patterns,
  activePatternNo,
  onPatternChange,
  onAddPattern,
  onDeletePattern,
}: PatternSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
        Pattern:
      </span>
      <div className="flex gap-1">
        {patterns.map((pattern, index) => (
          <div key={index} className="relative group">
            <button
              onClick={() => {
                onPatternChange(index);
              }}
              className={`
                px-3 py-1 text-sm font-medium rounded
                transition-colors
                ${
                  index === activePatternNo
                    ? "bg-blue-500 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
                }
              `}
            >
              {pattern.name}
            </button>
            {patterns.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePattern(index);
                }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-red-600"
                title="Delete pattern"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          onClick={onAddPattern}
          className="px-3 py-1 text-sm font-medium rounded bg-green-500 text-white hover:bg-green-600 transition-colors"
        >
          + New
        </button>
      </div>
    </div>
  );
}
