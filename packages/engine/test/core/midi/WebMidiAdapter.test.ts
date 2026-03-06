import { afterEach, describe, expect, it, vi } from "vitest";
import WebMidiAdapter from "@/core/midi/adapters/WebMidiAdapter";

function createMockMidiAccess(params: {
  sysexEnabled: boolean;
  outputSend: (data: number[] | Uint8Array, timestamp?: number) => void;
}): MIDIAccess {
  const output = {
    id: "out-1",
    name: "Launch Control XL 3 DAW",
    type: "output",
    state: "connected",
    send: params.outputSend,
  } as unknown as MIDIOutput;

  return {
    inputs: new Map<string, MIDIInput>(),
    outputs: new Map<string, MIDIOutput>([[output.id, output]]),
    sysexEnabled: params.sysexEnabled,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    onstatechange: null,
  } as unknown as MIDIAccess;
}

describe("WebMidiAdapter", () => {
  const originalNavigator = globalThis.navigator;

  const createNotAllowedError = () =>
    typeof DOMException !== "undefined"
      ? new DOMException(
          "System exclusive message is not allowed at index 0 (240).",
          "NotAllowedError",
        )
      : Object.assign(new Error("System exclusive not allowed"), {
          name: "NotAllowedError",
        });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, "navigator", {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
  });

  it("drops SysEx output when access does not allow SysEx messages", async () => {
    const sendSpy = vi.fn((data: number[] | Uint8Array) => {
      const status = Array.isArray(data) ? data[0] : data.at(0);
      if (status === 0xf0) {
        throw createNotAllowedError();
      }
    });

    const requestMIDIAccess = vi
      .fn()
      .mockRejectedValueOnce(createNotAllowedError())
      .mockResolvedValueOnce(
        createMockMidiAccess({
          sysexEnabled: false,
          outputSend: sendSpy,
        }),
      );

    Object.defineProperty(globalThis, "navigator", {
      value: { requestMIDIAccess },
      configurable: true,
      writable: true,
    });

    const adapter = new WebMidiAdapter();
    const midiAccess = await adapter.requestMIDIAccess();
    expect(midiAccess).not.toBeNull();
    expect(requestMIDIAccess).toHaveBeenNthCalledWith(1, { sysex: true });
    expect(requestMIDIAccess).toHaveBeenNthCalledWith(2);

    const outputs = Array.from(midiAccess!.outputs());
    expect(outputs).toHaveLength(1);

    const output = outputs[0]!;
    expect(() => output.send([0xf0, 0x00, 0xf7])).not.toThrow();
    expect(sendSpy).not.toHaveBeenCalled();

    output.send([0x90, 60, 127]);
    expect(sendSpy).toHaveBeenCalledWith([0x90, 60, 127], undefined);
  });
});
