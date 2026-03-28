import { describe, expect, it } from "vitest";
import MidiInputDevice from "@/core/midi/MidiInputDevice";
import MidiOutputDevice from "@/core/midi/MidiOutputDevice";
import { LaunchControlXL3 } from "@/core/midi/controllers/LaunchControlXL3";
import { waitForMicrotasks } from "../../utils/waitForCondition";

function createInputPort() {
  return {
    id: "lcxl3-in",
    name: "LCXL3 DAW In",
    state: "connected" as const,
    type: "input" as const,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };
}

function createOutputPort(sent: number[][]) {
  return {
    id: "lcxl3-out",
    name: "LCXL3 DAW Out",
    state: "connected" as const,
    type: "output" as const,
    send: (data: number[] | Uint8Array) => {
      sent.push(Array.from(data));
    },
  };
}

describe("LaunchControlXL3", () => {
  it("uses a darker play LED when stopped and a lighter one when playing", async (ctx) => {
    const sent: number[][] = [];
    const input = new MidiInputDevice(createInputPort(), ctx.context);
    const output = new MidiOutputDevice(createOutputPort(sent));

    const controller = new LaunchControlXL3(ctx.engine.id, {
      input,
      output,
    });

    expect(sent).toContainEqual([176, 116, 101]);

    await ctx.engine.start();

    expect(sent).toContainEqual([176, 116, 16]);

    controller.dispose();
    input.disconnect();
    output.disconnect();
  });

  it("maps sequencer step states to distinct channel-button colors", async (ctx) => {
    const sent: number[][] = [];
    const input = new MidiInputDevice(createInputPort(), ctx.context);
    const output = new MidiOutputDevice(createOutputPort(sent));

    const controller = new LaunchControlXL3(ctx.engine.id, {
      input,
      output,
    });

    await waitForMicrotasks();

    output.send([176, 37, 64]);
    output.send([176, 38, 96]);
    output.send([176, 39, 127]);

    expect(sent).toContainEqual([176, 37, 45]);
    expect(sent).toContainEqual([176, 38, 16]);
    expect(sent).toContainEqual([176, 39, 9]);

    controller.dispose();
    input.disconnect();
    output.disconnect();
  });
});
