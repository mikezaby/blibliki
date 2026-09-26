import type { MidiInputSchema } from "@blibliki/engine";
import { useEffect, useRef } from "react";

// The computer keyboard's note row, the one the engine's keyboard device
// uses: a home-row octave with the sharps on the row above.
const KEY_NOTES: readonly { key: string; note: string }[] = [
  { key: "a", note: "C3" },
  { key: "w", note: "C#3" },
  { key: "s", note: "D3" },
  { key: "e", note: "D#3" },
  { key: "d", note: "E3" },
  { key: "f", note: "F3" },
  { key: "t", note: "F#3" },
  { key: "g", note: "G3" },
  { key: "y", note: "G#3" },
  { key: "h", note: "A3" },
  { key: "u", note: "A#3" },
  { key: "j", note: "B3" },
  { key: "k", note: "C4" },
  { key: "o", note: "C#4" },
  { key: "l", note: "D4" },
  { key: "p", note: "D#4" },
];

// Pads walk the home row first, then the row above it.
const PAD_KEYS = [
  ...KEY_NOTES.filter((entry) => !entry.note.includes("#")),
  ...KEY_NOTES.filter((entry) => entry.note.includes("#")),
].map((entry) => entry.key);

// A black key's share of the white key it sits after.
const BLACK_KEY_WIDTH = 0.6;

type NoteKey = {
  key?: string;
  note: string;
  label: string;
  sharp: boolean;
};

function keysFor(schema: MidiInputSchema): NoteKey[] {
  if (schema.kind === "mapped") {
    return schema.notes.map((mapping, index) => ({
      key: PAD_KEYS[index],
      note: mapping.note,
      label: mapping.label,
      sharp: false,
    }));
  }

  return KEY_NOTES.map((entry) => ({
    ...entry,
    label: entry.note,
    sharp: entry.note.includes("#"),
  }));
}

function isTyping(target: EventTarget | null) {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

export type NoteKeysProps = {
  schema: MidiInputSchema;
  onNote: (note: string, on: boolean) => void;
  // Notes sounding on the track right now, from any source; they light up.
  sounding?: ReadonlySet<string>;
};

const NO_NOTES: ReadonlySet<string> = new Set();

// Keys or pads for the active track, so a sound can be tried with no MIDI
// hardware. The computer keyboard plays the same notes while nothing is
// being typed.
export default function NoteKeys({
  schema,
  onNote,
  sounding = NO_NOTES,
}: NoteKeysProps) {
  const keys = keysFor(schema);
  const onNoteRef = useRef(onNote);
  const pointerHeld = useRef(new Set<string>());

  useEffect(() => {
    onNoteRef.current = onNote;
  }, [onNote]);

  useEffect(() => {
    const byKey = new Map(
      keysFor(schema).flatMap((entry) =>
        entry.key ? [[entry.key, entry.note] as const] : [],
      ),
    );
    const held = new Set<string>();
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isTyping(event.target)
      ) {
        return;
      }
      const note = byKey.get(event.key.toLowerCase());
      if (!note || held.has(note)) {
        return;
      }
      held.add(note);
      onNoteRef.current(note, true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const note = byKey.get(event.key.toLowerCase());
      if (!note || !held.delete(note)) {
        return;
      }
      onNoteRef.current(note, false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      // A note held across a track change gets its release.
      held.forEach((note) => {
        onNoteRef.current(note, false);
      });
    };
  }, [schema]);

  const press = (note: string) => {
    if (pointerHeld.current.has(note)) {
      return;
    }
    pointerHeld.current.add(note);
    onNote(note, true);
  };
  const release = (note: string) => {
    if (!pointerHeld.current.delete(note)) {
      return;
    }
    onNote(note, false);
  };

  const handlers = (note: string) => ({
    onPointerDown: () => {
      press(note);
    },
    onPointerUp: () => {
      release(note);
    },
    onPointerLeave: () => {
      release(note);
    },
    onPointerCancel: () => {
      release(note);
    },
  });

  if (schema.kind === "mapped") {
    // Pads, each naming the MIDI note that plays it from a controller.
    return (
      <div
        role="group"
        aria-label="Keys"
        className="instrument-performance-keys grid grid-cols-4 gap-1 font-mono text-xs uppercase sm:grid-cols-8"
      >
        {keys.map((entry) => (
          <button
            key={entry.note}
            type="button"
            aria-label={entry.label}
            data-active={sounding.has(entry.note)}
            {...handlers(entry.note)}
            className="instrument-performance-key instrument-performance-key--pad"
          >
            <span className="truncate">{entry.label}</span>
            <small>
              {entry.note}
              {entry.key ? ` · ${entry.key}` : ""}
            </small>
          </button>
        ))}
      </div>
    );
  }

  const whites = keys.filter((entry) => !entry.sharp);
  const whiteWidth = 100 / whites.length;

  return (
    <div
      role="group"
      aria-label="Keys"
      className="instrument-performance-keys instrument-performance-keys--piano font-mono text-xs"
    >
      {whites.map((entry) => (
        <button
          key={entry.note}
          type="button"
          aria-label={entry.label}
          data-active={sounding.has(entry.note)}
          {...handlers(entry.note)}
          className="instrument-performance-key instrument-performance-key--white"
        >
          <span>{entry.label}</span>
          {entry.key ? <kbd>{entry.key}</kbd> : null}
        </button>
      ))}
      {keys.map((entry, index) => {
        if (!entry.sharp) {
          return null;
        }
        // A black key straddles the line after the white key before it.
        const whiteIndex = whites.findIndex(
          (white) => white.note === keys[index - 1]?.note,
        );

        return (
          <button
            key={entry.note}
            type="button"
            aria-label={entry.label}
            data-active={sounding.has(entry.note)}
            {...handlers(entry.note)}
            style={{
              left: `${String((whiteIndex + 1 - BLACK_KEY_WIDTH / 2) * whiteWidth)}%`,
              width: `${String(BLACK_KEY_WIDTH * whiteWidth)}%`,
            }}
            className="instrument-performance-key instrument-performance-key--black"
          >
            <span>{entry.label}</span>
            {entry.key ? <kbd>{entry.key}</kbd> : null}
          </button>
        );
      })}
    </div>
  );
}
