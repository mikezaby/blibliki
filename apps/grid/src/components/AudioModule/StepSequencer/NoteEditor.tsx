import { IStepNote } from "@blibliki/engine";
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
      <input
        type="text"
        value={noteInput}
        onChange={(e) => {
          setNoteInput(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") addNote();
        }}
        placeholder="Add note (e.g., C4, D#4, E4)..."
        className="flex-1 px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
      />
      <button
        onClick={addNote}
        className="px-4 py-2 text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors whitespace-nowrap"
      >
        + Note
      </button>
    </>
  );
}
