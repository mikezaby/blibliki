import { describe, expect, it } from "vitest";
import MidiEvent from "@/core/midi/MidiEvent";
import MidiInputDevice from "@/core/midi/MidiInputDevice";
import MidiOutputDevice from "@/core/midi/MidiOutputDevice";
import { LaunchControlXL3 } from "@/core/midi/controllers/LaunchControlXL3";
import { waitForMicrotasks } from "../../utils/waitForCondition";

function createInputPort() {
  const listeners = new Set<
    (event: { data: Uint8Array; timeStamp: number }) => void
  >();

  return {
    port: {
      id: "lcxl3-in",
      name: "LCXL3 DAW In",
      state: "connected" as const,
      type: "input" as const,
      addEventListener: (
        callback: (event: { data: Uint8Array; timeStamp: number }) => void,
      ) => {
        listeners.add(callback);
      },
      removeEventListener: (
        callback: (event: { data: Uint8Array; timeStamp: number }) => void,
      ) => {
        listeners.delete(callback);
      },
    },
    emit(data: number[]) {
      listeners.forEach((listener) => {
        listener({
          data: new Uint8Array(data),
          timeStamp: 0,
        });
      });
    },
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
    const inputPort = createInputPort();
    const input = new MidiInputDevice(inputPort.port, ctx.context);
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
    const inputPort = createInputPort();
    const input = new MidiInputDevice(inputPort.port, ctx.context);
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

  it("enables relative mode for all encoder rows and normalizes incoming encoder CCs", async (ctx) => {
    const sent: number[][] = [];
    const inputPort = createInputPort();
    const input = new MidiInputDevice(inputPort.port, ctx.context);
    const output = new MidiOutputDevice(createOutputPort(sent));
    const receivedEvents: MidiEvent[] = [];

    input.addEventListener((event) => {
      receivedEvents.push(event);
    });

    const controller = new LaunchControlXL3(ctx.engine.id, {
      input,
      output,
    });

    await waitForMicrotasks();

    expect(sent).toContainEqual([182, 69, 127]);
    expect(sent).toContainEqual([182, 72, 127]);
    expect(sent).toContainEqual([182, 73, 127]);

    inputPort.emit([0xbf, 77, 65]);
    inputPort.emit([0xbf, 92, 63]);
    inputPort.emit([0xbf, 100, 64]);

    expect(
      receivedEvents.map((event) => ({
        cc: event.cc,
        ccValue: event.ccValue,
        channel: event.channel,
      })),
    ).toEqual([
      {
        cc: 13,
        ccValue: 65,
        channel: 15,
      },
      {
        cc: 28,
        ccValue: 63,
        channel: 15,
      },
      {
        cc: 36,
        ccValue: 64,
        channel: 15,
      },
    ]);

    controller.dispose();

    expect(sent).toContainEqual([182, 69, 0]);
    expect(sent).toContainEqual([182, 72, 0]);
    expect(sent).toContainEqual([182, 73, 0]);

    input.disconnect();
    output.disconnect();
  });

  it("keeps the hardware in daw mode while a newer controller instance is still active", async (ctx) => {
    const sent: number[][] = [];
    const inputPort = createInputPort();
    const outputPort = createOutputPort(sent);
    const inputA = new MidiInputDevice(inputPort.port, ctx.context);
    const outputA = new MidiOutputDevice(outputPort);
    const controllerA = new LaunchControlXL3(ctx.engine.id, {
      input: inputA,
      output: outputA,
    });

    await waitForMicrotasks();

    const inputB = new MidiInputDevice(inputPort.port, ctx.context);
    const outputB = new MidiOutputDevice(outputPort);
    const controllerB = new LaunchControlXL3(ctx.engine.id, {
      input: inputB,
      output: outputB,
    });

    await waitForMicrotasks();

    const sentCountBeforeDispose = sent.length;
    controllerA.dispose();

    expect(sent.slice(sentCountBeforeDispose)).not.toContainEqual([182, 69, 0]);
    expect(sent.slice(sentCountBeforeDispose)).not.toContainEqual([182, 72, 0]);
    expect(sent.slice(sentCountBeforeDispose)).not.toContainEqual([182, 73, 0]);
    expect(sent.slice(sentCountBeforeDispose)).not.toContainEqual([159, 12, 0]);

    controllerB.dispose();

    expect(sent).toContainEqual([182, 69, 0]);
    expect(sent).toContainEqual([182, 72, 0]);
    expect(sent).toContainEqual([182, 73, 0]);
    expect(sent).toContainEqual([159, 12, 0]);

    inputA.disconnect();
    outputA.disconnect();
    inputB.disconnect();
    outputB.disconnect();
  });
});
