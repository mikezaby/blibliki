import { IStep, stepPropSchema } from "@blibliki/engine";
import Fader, { MarkProps } from "@/components/Fader";
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
      <div className="p-6 text-center text-slate-500">
        Select a step to edit
      </div>
    );
  }

  const hasNotes = step.notes.length > 0;
  const hasCC = step.ccMessages.length > 0;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              Step {stepIndex + 1}
            </span>
            <div
              className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                step.active
                  ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400"
              }`}
            >
              {step.active ? "Active" : "Muted"}
            </div>
            {hasNotes && (
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {step.notes.length} note{step.notes.length !== 1 ? "s" : ""}
              </div>
            )}
            {hasCC && (
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {step.ccMessages.length} CC
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => {
                onUpdate({ probability: 100 });
              }}
              className="px-2 py-1 text-xs bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded transition-colors"
              title="Reset probability to 100%"
            >
              100%
            </button>
            <button
              onClick={() => {
                onUpdate({ notes: [], ccMessages: [] });
              }}
              className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded transition-colors"
              title="Clear all notes and CC"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Main Parameters - Always Visible */}
      <div className="px-4 py-3 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-200 dark:border-slate-700">
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
      </div>

      {/* Notes and CC Content */}
      <div className="p-4 space-y-4">
        {/* Input Section */}
        <div className="flex gap-3 items-center">
          <NoteEditor
            notes={step.notes}
            onChange={(notes) => {
              onUpdate({ notes });
            }}
          />

          {/* Separator */}
          <div className="h-10 w-px bg-slate-300 dark:bg-slate-600 mx-2" />

          <CCEditor
            ccMessages={step.ccMessages}
            onChange={(ccMessages) => {
              onUpdate({ ccMessages });
            }}
          />
        </div>

        {/* Combined Notes and CC Grid */}
        {(step.notes.length > 0 || step.ccMessages.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Render all notes */}
            {step.notes.map((note, index) => (
              <div
                key={`note-${index}`}
                className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-[60px] pt-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
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
                <button
                  onClick={() => {
                    onUpdate({
                      notes: step.notes.filter((_, i) => i !== index),
                    });
                  }}
                  className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 rounded transition-colors shrink-0 mt-2"
                >
                  ✕
                </button>
              </div>
            ))}

            {/* Render all CC messages */}
            {step.ccMessages.map((ccMsg, index) => (
              <div
                key={`cc-${index}`}
                className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-[60px] pt-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
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
                <button
                  onClick={() => {
                    onUpdate({
                      ccMessages: step.ccMessages.filter((_, i) => i !== index),
                    });
                  }}
                  className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 rounded transition-colors shrink-0 mt-2"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
