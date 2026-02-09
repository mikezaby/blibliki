import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ComputerKeyboardInput from "@/core/midi/ComputerKeyboardDevice";

type KeyboardListener = (event: KeyboardEvent) => void;

type MockDocument = {
  addEventListener: (
    type: "keydown" | "keyup",
    listener: KeyboardListener,
  ) => void;
};

const listeners: Partial<Record<"keydown" | "keyup", KeyboardListener>> = {};

const keyboardEvent = (key: string, target: unknown) =>
  ({ key, repeat: false, timeStamp: 123, target }) as KeyboardEvent;

describe("ComputerKeyboardDevice", () => {
  const previousDocument = globalThis.document;

  beforeEach(() => {
    listeners.keydown = undefined;
    listeners.keyup = undefined;

    const mockDocument: MockDocument = {
      addEventListener: (type, listener) => {
        listeners[type] = listener;
      },
    };

    (globalThis as { document: MockDocument }).document = mockDocument;
  });

  it("emits note events when key is pressed outside text inputs", () => {
    const browserToContextTime = vi.fn(() => 1);
    const callback = vi.fn();
    const device = new ComputerKeyboardInput({
      browserToContextTime,
    } as any);

    device.addEventListener(callback);
    listeners.keydown?.(keyboardEvent("a", { tagName: "DIV" }));

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]?.[0].type).toBe("noteon");
    expect(callback.mock.calls[0]?.[0].note?.fullName).toBe("C3");
    expect(browserToContextTime).toHaveBeenCalledWith(123);
  });

  it("ignores keydown events while typing in input fields", () => {
    const browserToContextTime = vi.fn(() => 1);
    const callback = vi.fn();
    const device = new ComputerKeyboardInput({
      browserToContextTime,
    } as any);

    device.addEventListener(callback);
    listeners.keydown?.(keyboardEvent("a", { tagName: "INPUT" }));

    expect(callback).not.toHaveBeenCalled();
    expect(browserToContextTime).not.toHaveBeenCalled();
  });

  it("ignores keyup events while typing in textareas", () => {
    const browserToContextTime = vi.fn(() => 1);
    const callback = vi.fn();
    const device = new ComputerKeyboardInput({
      browserToContextTime,
    } as any);

    device.addEventListener(callback);
    listeners.keyup?.(keyboardEvent("a", { tagName: "TEXTAREA" }));

    expect(callback).not.toHaveBeenCalled();
    expect(browserToContextTime).not.toHaveBeenCalled();
  });

  afterEach(() => {
    (globalThis as { document: Document | undefined }).document =
      previousDocument;
  });
});
