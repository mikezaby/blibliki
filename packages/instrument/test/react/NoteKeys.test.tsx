// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import NoteKeys from "@/react/NoteKeys";

describe("NoteKeys", () => {
  afterEach(() => {
    cleanup();
  });

  it("lays a free track out as a piano, black keys over the gaps", () => {
    render(<NoteKeys schema={{ kind: "free" }} onNote={vi.fn()} />);

    const keys = screen.getByRole("group", { name: "Keys" });
    const white = within(keys).getByRole("button", { name: "C3" });
    const black = within(keys).getByRole("button", { name: "C#3" });

    expect(white.style.left).toBe("");
    // Nine white keys: C#3 straddles the line after the first one.
    expect(black.style.left).toBe(`${String((1 - 0.3) * (100 / 9))}%`);
    expect(black.style.width).toBe(`${String(0.6 * (100 / 9))}%`);
    expect(within(keys).getAllByRole("button")).toHaveLength(16);
  });

  it("lights the notes that are sounding", () => {
    render(
      <NoteKeys
        schema={{ kind: "free" }}
        onNote={vi.fn()}
        sounding={new Set(["E3", "F#3"])}
      />,
    );

    const keys = screen.getByRole("group", { name: "Keys" });
    expect(
      within(keys).getByRole("button", { name: "E3" }).dataset.active,
    ).toBe("true");
    expect(
      within(keys).getByRole("button", { name: "F#3" }).dataset.active,
    ).toBe("true");
    expect(
      within(keys).getByRole("button", { name: "F3" }).dataset.active,
    ).toBe("false");
  });

  it("names the MIDI note behind each pad of a mapped track", () => {
    const onNote = vi.fn();
    render(
      <NoteKeys
        schema={{
          kind: "mapped",
          notes: [
            { key: "kick", note: "C1", label: "Kick" },
            { key: "snare", note: "D1", label: "Snare" },
          ],
        }}
        onNote={onNote}
      />,
    );

    const keys = screen.getByRole("group", { name: "Keys" });
    const snare = within(keys).getByRole("button", { name: "Snare" });

    expect(snare.textContent).toContain("D1");
    expect(snare.textContent).toContain("s");

    fireEvent.pointerDown(snare);
    fireEvent.pointerUp(snare);

    expect(onNote.mock.calls).toEqual([
      ["D1", true],
      ["D1", false],
    ]);
  });
});
