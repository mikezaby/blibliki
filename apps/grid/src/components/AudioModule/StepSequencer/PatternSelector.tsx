import { IPattern, moduleSchemas, ModuleType } from "@blibliki/engine";
import { TUpdateProp } from "..";
import { CheckboxField } from "../attributes/Field";

type PatternSelectorProps = {
  patterns: IPattern[];
  activePatternNo: number;
  onPatternChange: (index: number) => void;
  onAddPattern: () => void;
  onDeletePattern: (index: number) => void;
  isRunning?: boolean;
  patternSequence: string;
  enableSequence: boolean;
  sequencePosition?: string;
  updateProp: TUpdateProp<ModuleType.StepSequencer>;
};

const schema = moduleSchemas[ModuleType.StepSequencer];

export default function PatternSelector({
  patterns,
  activePatternNo,
  onPatternChange,
  onAddPattern,
  onDeletePattern,
  patternSequence,
  enableSequence,
  sequencePosition,
  updateProp,
  isRunning = false,
}: PatternSelectorProps) {
  const isSequenceActive = isRunning && enableSequence;
  const formatPatternSequence = (value: string) => {
    const normalized = value.replace(/\s+/g, "");
    const tokens = normalized.match(/\d+[A-Za-z]/g) ?? [];
    const consumed = tokens.join("");
    const remainder = normalized.slice(consumed.length);
    const formattedTokens = tokens
      .map((token, index) =>
        index > 0 && index % 8 === 0 ? `\n${token}` : token,
      )
      .join("");

    if (remainder.length === 0) {
      return formattedTokens;
    }

    const needsNewLine = tokens.length > 0 && tokens.length % 8 === 0;
    return `${formattedTokens}${needsNewLine ? "\n" : ""}${remainder}`;
  };

  const handleSequenceChange = (value: string) => {
    const normalized = value.replace(/\s+/g, "");
    updateProp("patternSequence")(normalized);
  };

  return (
    <div className="flex justify-between items-center gap-2">
      <div>
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
                disabled={isSequenceActive}
                className={`
                px-3 py-1 text-sm font-medium rounded
                transition-colors
                ${
                  index === activePatternNo
                    ? "bg-blue-500 text-white"
                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600"
                }
                ${isSequenceActive ? "opacity-50 cursor-not-allowed" : ""}
              `}
                title={
                  isSequenceActive
                    ? "Pattern selection disabled during sequence playback"
                    : undefined
                }
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

      <div className="flex gap-2">
        {/* Pattern Sequence Section */}
        <div className="flex items-center gap-2">
          <CheckboxField
            name="Pattern sequence"
            value={enableSequence}
            schema={schema.enableSequence}
            onChange={updateProp("enableSequence")}
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Sequence:
          </label>
          <textarea
            rows={3}
            value={formatPatternSequence(patternSequence)}
            onChange={(e) => {
              handleSequenceChange(e.target.value);
            }}
            disabled={isRunning}
            placeholder="e.g., 2A4B2AC"
            className="nodrag px-2 py-1 text-sm font-mono border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 w-48 resize-none leading-5"
          />
          {sequencePosition && (
            <span className="text-xs font-medium text-green-600 dark:text-green-400">
              {sequencePosition}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
