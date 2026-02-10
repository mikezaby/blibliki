import { IStepNote } from "@blibliki/engine";
import { Button, Input } from "@chakra-ui/react";
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
        flex="1"
        size="sm"
        borderColor="border"
        bg="surfaceBg"
        color="fg"
      />
      <Button
        onClick={addNote}
        size="sm"
        colorPalette="blue"
        whiteSpace="nowrap"
      >
        + Note
      </Button>
    </>
  );
}
