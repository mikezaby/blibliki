import { IStepNote } from "@blibliki/engine";
import { Button, Input } from "@blibliki/ui";
import { Plus } from "lucide-react";
import { useState } from "react";

type NoteEditorProps = {
  notes: IStepNote[];
  onChange: (notes: IStepNote[]) => void;
};

export default function NoteEditor({ notes, onChange }: NoteEditorProps) {
  const [noteInput, setNoteInput] = useState("");

  const addNote = () => {
    if (!noteInput.trim()) return;

    const newNote: IStepNote = {
      note: noteInput.trim().toUpperCase(),
      velocity: 100,
    };

    onChange([...notes, newNote]);
    setNoteInput("");
  };

  return (
    <>
      <Input
        type="text"
        value={noteInput}
        onChange={(e) => {
          setNoteInput(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") addNote();
        }}
        placeholder="Add note (e.g., C4, D#4, E4)..."
        className="flex-1"
      />
      <Button onClick={addNote}>
        <Plus className="w-4 h-4" />
        Note
      </Button>
    </>
  );
}
