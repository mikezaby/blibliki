import { IStepNote, MidiInputSchema } from "@blibliki/engine";
import { Button, Input, OptionSelect } from "@blibliki/ui";
import { Plus } from "lucide-react";
import { useState } from "react";

type NoteEditorProps = {
  notes: IStepNote[];
  noteSchema: MidiInputSchema;
  onChange: (notes: IStepNote[]) => void;
};

export default function NoteEditor({
  notes,
  noteSchema,
  onChange,
}: NoteEditorProps) {
  const [noteInput, setNoteInput] = useState("");
  const mappedOptions =
    noteSchema.kind === "mapped"
      ? noteSchema.notes.map(({ note, label }) => ({
          name: label,
          value: note,
        }))
      : [];
  const [mappedNote, setMappedNote] = useState(mappedOptions[0]?.value ?? "");

  const addNote = (note: string) => {
    if (!note.trim()) return;

    onChange([...notes, { note: note.trim().toUpperCase(), velocity: 100 }]);
  };

  if (mappedOptions.length > 0) {
    return (
      <>
        <OptionSelect
          label="Select a note"
          value={mappedNote}
          options={mappedOptions}
          onChange={setMappedNote}
          triggerClassName="flex-1"
        />
        <Button
          onClick={() => {
            addNote(mappedNote);
          }}
        >
          <Plus className="w-4 h-4" />
          Note
        </Button>
      </>
    );
  }

  return (
    <>
      <Input
        type="text"
        value={noteInput}
        onChange={(e) => {
          setNoteInput(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            addNote(noteInput);
            setNoteInput("");
          }
        }}
        placeholder="Add note (e.g., C4, D#4, E4)..."
        className="flex-1"
      />
      <Button
        onClick={() => {
          addNote(noteInput);
          setNoteInput("");
        }}
      >
        <Plus className="w-4 h-4" />
        Note
      </Button>
    </>
  );
}
