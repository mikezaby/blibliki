import { IStep, stepPropSchema } from "@blibliki/engine";
import {
  Button,
  Divider,
  Fader,
  Stack,
  Surface,
  type MarkProps,
} from "@blibliki/ui";
import CCEditor from "./CCEditor";
import NoteEditor from "./NoteEditor";

type StepEditorProps = {
  step: IStep | undefined;
  stepIndex: number;
  onUpdate: (updates: Partial<IStep>) => void;
};

const DURATION_MARKS: MarkProps[] = stepPropSchema.duration.options.map(
  (duration, i) => {
    return { value: i, label: duration };
  },
);

export default function StepEditor({
  step,
  stepIndex,
  onUpdate,
}: StepEditorProps) {
  if (!step) {
    return (
      <Surface
        tone="subtle"
        border="subtle"
        radius="md"
        className="p-6 text-center"
      >
        Select a step to edit
      </Surface>
    );
  }

  const hasNotes = step.notes.length > 0;
  const hasCC = step.ccMessages.length > 0;
  const statusStyle = step.active
    ? {
        background:
          "color-mix(in oklab, var(--ui-color-success-500), transparent 82%)",
        color: "var(--ui-color-success-600)",
      }
    : {
        background: "var(--ui-color-surface-panel)",
        color: "var(--ui-color-text-muted)",
      };

  return (
    <Surface
      tone="raised"
      border="subtle"
      radius="lg"
      className="overflow-hidden"
    >
      {/* Header */}
      <Surface tone="panel" radius="none" asChild>
        <header className="px-4 py-3">
          <Stack direction="row" align="center" justify="between" gap={3}>
            <Stack direction="row" align="center" gap={3} className="flex-wrap">
              <span className="text-sm font-semibold">
                Step {stepIndex + 1}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={statusStyle}
              >
                {step.active ? "Active" : "Muted"}
              </span>
              {hasNotes && (
                <span
                  className="text-xs"
                  style={{ color: "var(--ui-color-text-muted)" }}
                >
                  {step.notes.length} note{step.notes.length !== 1 ? "s" : ""}
                </span>
              )}
              {hasCC && (
                <span
                  className="text-xs"
                  style={{ color: "var(--ui-color-text-muted)" }}
                >
                  {step.ccMessages.length} CC
                </span>
              )}
            </Stack>

            {/* Quick Actions */}
            <Stack direction="row" gap={2}>
              <Button
                size="sm"
                variant="text"
                color="secondary"
                onClick={() => {
                  onUpdate({ probability: 100 });
                }}
                title="Reset probability to 100%"
              >
                100%
              </Button>
              <Button
                size="sm"
                variant="text"
                color="error"
                onClick={() => {
                  onUpdate({ notes: [], ccMessages: [] });
                }}
                title="Clear all notes and CC"
              >
                Clear
              </Button>
            </Stack>
          </Stack>
        </header>
      </Surface>

      {/* Main Parameters - Always Visible */}
      <Divider />
      <Surface tone="subtle" radius="none" asChild>
        <section className="px-4 py-3">
          <div className="grid grid-cols-3 gap-4">
            <Fader
              name={stepPropSchema.probability.label ?? "Probability"}
              value={step.probability}
              onChange={(_, value) => {
                onUpdate({ probability: value });
              }}
              min={stepPropSchema.probability.min}
              max={stepPropSchema.probability.max}
              step={stepPropSchema.probability.step}
              orientation="horizontal"
            />

            <Fader
              name={stepPropSchema.duration.label ?? "Duration"}
              value={stepPropSchema.duration.options.indexOf(step.duration)}
              onChange={(_, value) => {
                const index = Math.round(value);
                const duration = stepPropSchema.duration.options[index];
                onUpdate({ duration });
              }}
              marks={DURATION_MARKS}
              hideMarks
              step={1}
              orientation="horizontal"
            />

            <Fader
              name={stepPropSchema.microtimeOffset.label ?? "Microtiming"}
              value={step.microtimeOffset}
              onChange={(_, value) => {
                onUpdate({ microtimeOffset: value });
              }}
              min={stepPropSchema.microtimeOffset.min}
              max={stepPropSchema.microtimeOffset.max}
              step={stepPropSchema.microtimeOffset.step}
              orientation="horizontal"
            />
          </div>
        </section>
      </Surface>

      {/* Notes and CC Content */}
      <Divider />
      <Stack gap={4} className="p-4">
        {/* Input Section */}
        <Stack direction="row" gap={3} align="center" className="flex-wrap">
          <NoteEditor
            notes={step.notes}
            onChange={(notes) => {
              onUpdate({ notes });
            }}
          />

          {/* Separator */}
          <Divider orientation="vertical" className="mx-2 h-10" />

          <CCEditor
            ccMessages={step.ccMessages}
            onChange={(ccMessages) => {
              onUpdate({ ccMessages });
            }}
          />
        </Stack>

        {/* Combined Notes and CC Grid */}
        {(step.notes.length > 0 || step.ccMessages.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Render all notes */}
            {step.notes.map((note, index) => (
              <Surface
                key={`note-${index}`}
                tone="subtle"
                border="subtle"
                radius="md"
                className="flex items-start gap-3 p-3"
              >
                <div className="flex items-center gap-2 min-w-[60px] pt-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-mono text-sm font-semibold">
                    {note.note}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <Fader
                    name="Velocity"
                    value={note.velocity}
                    onChange={(_, value) => {
                      const updatedNotes = [...step.notes];
                      updatedNotes[index] = { ...note, velocity: value };
                      onUpdate({ notes: updatedNotes });
                    }}
                    min={1}
                    max={127}
                    step={1}
                    orientation="horizontal"
                  />
                </div>
                <Button
                  size="sm"
                  variant="text"
                  color="error"
                  onClick={() => {
                    onUpdate({
                      notes: step.notes.filter((_, i) => i !== index),
                    });
                  }}
                  className="mt-2 shrink-0"
                >
                  ✕
                </Button>
              </Surface>
            ))}

            {/* Render all CC messages */}
            {step.ccMessages.map((ccMsg, index) => (
              <Surface
                key={`cc-${index}`}
                tone="subtle"
                border="subtle"
                radius="md"
                className="flex items-start gap-3 p-3"
              >
                <div className="flex items-center gap-2 min-w-[60px] pt-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="font-mono text-sm font-semibold">
                    CC {ccMsg.cc}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <Fader
                    name="Value"
                    value={ccMsg.value}
                    onChange={(_, value) => {
                      const updatedCC = [...step.ccMessages];
                      updatedCC[index] = { ...ccMsg, value };
                      onUpdate({ ccMessages: updatedCC });
                    }}
                    min={0}
                    max={127}
                    step={1}
                    orientation="horizontal"
                  />
                </div>
                <Button
                  size="sm"
                  variant="text"
                  color="error"
                  onClick={() => {
                    onUpdate({
                      ccMessages: step.ccMessages.filter((_, i) => i !== index),
                    });
                  }}
                  className="mt-2 shrink-0"
                >
                  ✕
                </Button>
              </Surface>
            ))}
          </div>
        )}
      </Stack>
    </Surface>
  );
}
