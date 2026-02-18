import { IPattern, moduleSchemas, ModuleType } from "@blibliki/engine";
import { Button, IconButton } from "@blibliki/ui";
import { Plus, X } from "lucide-react";
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
              <Button
                size="sm"
                variant={index === activePatternNo ? "contained" : "outlined"}
                onClick={() => {
                  onPatternChange(index);
                }}
                disabled={isSequenceActive}
              >
                {pattern.name}
              </Button>
              {patterns.length > 1 && (
                <IconButton
                  aria-label="Delete pattern"
                  icon={<X />}
                  size="xs"
                  color="error"
                  variant="contained"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeletePattern(index);
                  }}
                  className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete pattern"
                />
              )}
            </div>
          ))}
          <Button size="sm" color="success" onClick={onAddPattern}>
            <Plus className="w-4 h-4" />
            New
          </Button>
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
