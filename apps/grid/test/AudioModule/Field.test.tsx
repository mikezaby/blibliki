// @vitest-environment jsdom
import { moduleSchemas, ModuleType } from "@blibliki/engine";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InputField } from "../../src/components/AudioModule/attributes/Field";

describe("InputField", () => {
  afterEach(cleanup);

  it("renders bounded number props as encoder sliders and emits numeric updates", () => {
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

  it.each([
    ["Constant value", moduleSchemas[ModuleType.Constant].value, 12],
    ["Scale minimum", moduleSchemas[ModuleType.Scale].min, -24],
    ["Scale maximum", moduleSchemas[ModuleType.Scale].max, 48],
    ["Scale current", moduleSchemas[ModuleType.Scale].current, 6.5],
  ])("renders %s as an open-ended numeric input", (_, schema, nextValue) => {
    const onChange = vi.fn();

    render(<InputField value={0} schema={schema} onChange={onChange} />);

    expect(screen.queryByRole("slider", { name: schema.label })).toBeNull();

    const input = screen.getByRole("spinbutton", { name: schema.label });
    fireEvent.change(input, { target: { value: `${nextValue}` } });

    expect(onChange).toHaveBeenCalledWith(nextValue);
  });
});
