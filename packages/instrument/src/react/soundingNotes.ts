import { type MidiEvent, MidiEventType } from "@blibliki/engine";
import { useEffect, useState } from "react";

export type MidiSource = {
  moduleId: string;
  ioName: string;
};

type SoundingNotesEngine = {
  context: { currentTime: number };
  findIO?: (
    moduleId: string,
    ioName: string,
    type: "input" | "output",
  ) => {
    name: string;
    listen?: (listener: (event: MidiEvent) => void) => () => void;
  };
};

// The notes sounding on a track, from every source that reaches it: a
// keyboard through the track's channel filter, and the sequencer. The
// sequencer schedules ahead, so a note lights when it plays, not when it
// is sent.
export function useSoundingNotes(
  engine: SoundingNotesEngine | undefined,
  sources: readonly MidiSource[],
): ReadonlySet<string> {
  const [sounding, setSounding] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const sourceKey = sources
    .map((source) => `${source.moduleId}\t${source.ioName}`)
    .join("\n");

  useEffect(() => {
    if (!engine || !sourceKey) {
      return;
    }

    const timers = new Set<ReturnType<typeof setTimeout>>();
    const onEvent = (event: MidiEvent) => {
      const note = event.note?.fullName;
      if (!event.isNote || !note) {
        return;
      }

      const on =
        event.type === MidiEventType.noteOn && (event.note?.velocity ?? 0) > 0;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const apply = () => {
        if (timer) {
          timers.delete(timer);
        }
        setSounding((current) => {
          if (current.has(note) === on) {
            return current;
          }
          const next = new Set(current);
          if (on) {
            next.add(note);
          } else {
            next.delete(note);
          }
          return next;
        });
      };
      const delayMs = (event.triggeredAt - engine.context.currentTime) * 1000;
      if (delayMs > 1) {
        timer = setTimeout(apply, delayMs);
        timers.add(timer);
      } else {
        apply();
      }
    };

    const stops = sourceKey.split("\n").flatMap((entry) => {
      const [moduleId, ioName] = entry.split("\t");
      if (!moduleId || !ioName) {
        return [];
      }
      try {
        const stop = engine
          .findIO?.(moduleId, ioName, "output")
          .listen?.(onEvent);
        return stop ? [stop] : [];
      } catch {
        return [];
      }
    });

    return () => {
      stops.forEach((stop) => {
        stop();
      });
      timers.forEach((timer) => {
        clearTimeout(timer);
      });
      setSounding(new Set());
    };
  }, [engine, sourceKey]);

  return sounding;
}
