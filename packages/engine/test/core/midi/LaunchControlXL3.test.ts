import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Message from "@/core/midi/Message";
import MidiEvent from "@/core/midi/MidiEvent";
import { LaunchControlXL3 } from "@/core/midi/controllers/LaunchControlXL3";

const PLAY_CONTROL = 116;
const RECORD_CONTROL = 118;

const PLAY_STOPPED_COLOR = 16;
const PLAY_PLAYING_COLOR = 101;
const RECORD_STOPPED_COLOR = 4;
const RECORD_PLAYING_COLOR = 120;

const transportEvent = (control: number, value: number) =>
  new MidiEvent(new Message(new Uint8Array([0x90, control, value])), 0);
const flushTasks = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("LaunchControlXL3", () => {
  beforeEach(() => {
    vi.spyOn(LaunchControlXL3.prototype, "animateColors").mockImplementation(
      () => {},
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts engine on play press and updates transport colors for playing state", async () => {
    let inputListener: ((event: MidiEvent) => void) | undefined;
    let isPlaying = false;
    const onStart = vi.fn(() => {
      isPlaying = true;
    });
    const onStop = vi.fn();
    const output = {
      send: vi.fn(),
    };
    const input = {
      addEventListener: vi.fn((listener: (event: MidiEvent) => void) => {
        inputListener = listener;
      }),
    };

    new LaunchControlXL3({
      input,
      output,
      onStart,
      onStop,
      isPlayingState: () => isPlaying,
    } as any);

    expect(inputListener).toBeDefined();

    inputListener!(transportEvent(PLAY_CONTROL, 127));
    await flushTasks();
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStop).not.toHaveBeenCalled();
    expect(output.send).toHaveBeenCalledWith([
      176,
      PLAY_CONTROL,
      PLAY_PLAYING_COLOR,
    ]);
    expect(output.send).toHaveBeenCalledWith([
      176,
      RECORD_CONTROL,
      RECORD_PLAYING_COLOR,
    ]);
  });

  it("stops engine on record press and updates transport colors for stopped state", async () => {
    let inputListener: ((event: MidiEvent) => void) | undefined;
    let isPlaying = true;
    const onStart = vi.fn();
    const onStop = vi.fn(() => {
      isPlaying = false;
    });
    const output = {
      send: vi.fn(),
    };
    const input = {
      addEventListener: vi.fn((listener: (event: MidiEvent) => void) => {
        inputListener = listener;
      }),
    };

    new LaunchControlXL3({
      input,
      output,
      onStart,
      onStop,
      isPlayingState: () => isPlaying,
    } as any);

    expect(inputListener).toBeDefined();

    inputListener!(transportEvent(RECORD_CONTROL, 127));
    await flushTasks();

    expect(onStop).toHaveBeenCalledTimes(1);
    expect(onStart).not.toHaveBeenCalled();
    expect(output.send).toHaveBeenCalledWith([
      176,
      PLAY_CONTROL,
      PLAY_STOPPED_COLOR,
    ]);
    expect(output.send).toHaveBeenCalledWith([
      176,
      RECORD_CONTROL,
      RECORD_STOPPED_COLOR,
    ]);
  });
});
