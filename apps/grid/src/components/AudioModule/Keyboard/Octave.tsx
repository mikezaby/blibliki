import { Note } from "@blibliki/engine";
import Key from "./Key";

type OctaveProps = {
  id: string;
  octave: number;
  props: { activeNotes: string[] };
  triggerable: boolean;
};

export default function Octave(params: OctaveProps) {
  const {
    id,
    props: { activeNotes },
    octave,
    triggerable,
  } = params;

  return (
    <div className="keyboard-octave">
      {Note.notes(octave).map((note: Note) => (
        <Key
          key={note.fullName}
          id={id}
          triggerable={triggerable}
          note={note}
          active={activeNote(activeNotes, note)}
        />
      ))}
    </div>
  );
}

function activeNote(activeNotes: string[], note: Note) {
  return activeNotes.some((n) => n === note.fullName);
}
