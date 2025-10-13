import { Engine, Note } from "@blibliki/engine";
import { useCallback, useMemo, useState } from "react";

const Keys: Record<string, string> = {
  C: "white-key c-key",
  "C#": "black-key c-sharp-key",
  D: "white-key d-key",
  "D#": "black-key d-sharp-key",
  E: "white-key e-key",
  F: "white-key f-key",
  "F#": "black-key f-sharp-key",
  G: "white-key g-key",
  "G#": "black-key g-sharp-key",
  A: "white-key a-key",
  "A#": "black-key a-sharp-key",
  B: "white-key b-key",
};

type KeyProps = {
  id: string;
  note: Note;
  active: boolean;
  triggerable: boolean;
}

export default function Key(props: KeyProps) {
  const [mouseDown, setMouseDown] = useState<boolean>();
  const { id, note, active, triggerable } = props;

  const className = useMemo(() => {
    const names = [Keys[note.name]];
    names.push("nodrag cursor-pointer");

    if (active || mouseDown) names.push("active");

    return names.join(" ");
  }, [active, mouseDown, note.name]);

  const trigger = useCallback(
    (type: "noteOn" | "noteOff", force = false) =>
      () => {
        if (!triggerable && !force) return;

        setMouseDown(type === "noteOn");
        Engine.current.triggerVirtualMidi(id, note.fullName, type);
      },
    [id, triggerable, note.fullName],
  );

  return (
    <div
      onMouseEnter={trigger("noteOn")}
      onMouseLeave={trigger("noteOff")}
      onMouseDown={trigger("noteOn", true)}
      onMouseUp={trigger("noteOff", true)}
      className={className}
    />
  );
}
