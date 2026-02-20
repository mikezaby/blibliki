import { IPattern, moduleSchemas, ModuleType } from "@blibliki/engine";
import {
  Button,
  IconButton,
  Label,
  Stack,
  Surface,
  uiTone,
  uiVars,
} from "@blibliki/ui";
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
    <Stack
      direction="row"
      justify="between"
      align="start"
      gap={3}
      className="flex-wrap"
    >
      <Stack gap={2}>
        <p className="text-sm font-medium">Pattern:</p>
        <Stack direction="row" gap={1} className="flex-wrap">
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
        </Stack>
      </Stack>

      <Stack direction="row" gap={2} align="start" className="flex-wrap">
        {/* Pattern Sequence Section */}
        <Stack direction="row" align="center" gap={2}>
          <CheckboxField
            name="Pattern sequence"
            value={enableSequence}
            schema={schema.enableSequence}
            onChange={updateProp("enableSequence")}
          />
        </Stack>

        <Surface tone="subtle" border="subtle" radius="md" className="p-2">
          <Stack direction="row" align="center" gap={2}>
            <Label className="text-xs font-medium">Sequence:</Label>
            <textarea
              rows={3}
              value={formatPatternSequence(patternSequence)}
              onChange={(e) => {
                handleSequenceChange(e.target.value);
              }}
              disabled={isRunning}
              placeholder="e.g., 2A4B2AC"
              className="nodrag w-48 resize-none rounded border px-2 py-1 font-mono text-sm leading-5"
              style={{
                background: uiVars.surface.raised,
                borderColor: uiVars.border.subtle,
                color: uiVars.text.primary,
              }}
            />
            {sequencePosition && (
              <span
                className="text-xs font-medium"
                style={{ color: uiTone("success", "600") }}
              >
                {sequencePosition}
              </span>
            )}
          </Stack>
        </Surface>
      </Stack>
    </Stack>
  );
}
