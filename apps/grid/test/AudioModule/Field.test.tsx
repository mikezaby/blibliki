// @vitest-environment jsdom
import { moduleSchemas, ModuleType } from "@blibliki/engine";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InputField } from "../../src/components/AudioModule/attributes/Field";

describe("InputField", () => {
  it("renders number props as encoder sliders and emits numeric updates", () => {
    const onChange = vi.fn();

    render(
      <InputField
        value={120}
        schema={moduleSchemas[ModuleType.TransportControl].bpm}
        onChange={onChange}
      />,
    );

    const encoder = screen.getByRole("slider", { name: "BPM" });

    expect(screen.queryByRole("spinbutton", { name: "BPM" })).toBeNull();

    fireEvent.keyDown(encoder, { key: "ArrowUp" });

    expect(onChange).toHaveBeenCalledWith(121);
  });
});
