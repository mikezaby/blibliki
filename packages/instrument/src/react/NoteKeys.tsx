import type { MidiInputSchema } from "@blibliki/engine";
import { Button, Text, cn } from "@blibliki/ui";
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

type NoteKey = {
  key?: string;
  note: string;
  label: string;
  sharp: boolean;
};

function keysFor(schema: MidiInputSchema): NoteKey[] {
  if (schema.kind === "mapped") {
    return schema.notes.map((mapping, index) => ({
      key: KEY_NOTES[index]?.key,
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
};

// Keys or pads for the active track, so a sound can be tried with no MIDI
// hardware. The computer keyboard plays the same notes while nothing is
// being typed.
export default function NoteKeys({ schema, onNote }: NoteKeysProps) {
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

  return (
    <div
      role="group"
      aria-label="Keys"
      className={cn(
        "grid gap-1",
        schema.kind === "mapped"
          ? "grid-cols-4 sm:grid-cols-8"
          : "grid-cols-8 sm:grid-cols-16",
      )}
    >
      {keys.map((entry) => (
        <Button
          key={entry.note}
          variant="outlined"
          color="neutral"
          aria-label={entry.label}
          onPointerDown={() => {
            press(entry.note);
          }}
          onPointerUp={() => {
            release(entry.note);
          }}
          onPointerLeave={() => {
            release(entry.note);
          }}
          onPointerCancel={() => {
            release(entry.note);
          }}
          className={cn(
            "h-auto select-none flex-col gap-1 px-1 py-2 font-mono text-xs uppercase",
            entry.sharp && "opacity-60",
          )}
        >
          <span className="truncate">{entry.label}</span>
          {entry.key ? (
            <Text asChild size="xs" tone="muted">
              <kbd>{entry.key}</kbd>
            </Text>
          ) : null}
        </Button>
      ))}
    </div>
  );
}
