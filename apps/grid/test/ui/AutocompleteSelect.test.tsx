// @vitest-environment jsdom
import { AutocompleteSelect } from "@blibliki/ui";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("AutocompleteSelect", () => {
  afterEach(cleanup);

  it("filters options in the popup and selects by value", () => {
    const onChange = vi.fn();

    const { container } = render(
      <AutocompleteSelect
        label="Macro target"
        value="track-1.filter.main.cutoff"
        options={[
          {
            name: "track-1 / filter.main / Cutoff",
            value: "track-1.filter.main.cutoff",
            searchText: "track-1 filter cutoff",
          },
          {
            name: "track-2 / filter.main / Cutoff",
            value: "track-2.filter.main.cutoff",
            searchText: "track-2 filter cutoff",
          },
          {
            name: "track-2 / source.main / Frequency",
            value: "track-2.source.main.frequency",
            searchText: "track-2 source frequency",
          },
        ]}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole("combobox", { name: "Macro target" }));
    expect(
      container.contains(screen.getByRole("listbox", { name: "Macro target" })),
    ).toBe(false);

    fireEvent.change(
      screen.getByRole("textbox", { name: "Search Macro target" }),
      {
        target: { value: "track-2 cutoff" },
      },
    );

    expect(
      screen.queryByRole("option", { name: "track-1 / filter.main / Cutoff" }),
    ).toBeNull();

    fireEvent.click(
      screen.getByRole("option", { name: "track-2 / filter.main / Cutoff" }),
    );

    expect(onChange).toHaveBeenCalledWith("track-2.filter.main.cutoff");
  });
});
