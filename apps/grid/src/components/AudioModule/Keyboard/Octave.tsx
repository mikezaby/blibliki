import { Note } from "@blibliki/engine";
import Key from "./Key";

const toneWidth = 25.3;
const semiToneHeight = 24 * 4;

const toneWidthColumn = `${(toneWidth * 2.0) / 3}px`;
const semiToneWidthColumn = `${(toneWidth * 1.0) / 3}px`;

const style = {
  display: "inline-grid",
  gridTemplateColumns: `${toneWidthColumn} ${semiToneWidthColumn}
    ${semiToneWidthColumn} ${semiToneWidthColumn} ${semiToneWidthColumn}
    ${semiToneWidthColumn} ${toneWidthColumn}
    ${toneWidthColumn} ${semiToneWidthColumn}
    ${semiToneWidthColumn} ${semiToneWidthColumn} ${semiToneWidthColumn}
    ${semiToneWidthColumn} ${semiToneWidthColumn} ${semiToneWidthColumn}
    ${semiToneWidthColumn} ${toneWidthColumn}`,
  gridTemplateRows: `${semiToneHeight}px`,
};

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
    <div style={style}>
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
