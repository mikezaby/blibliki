import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Message from "@/core/midi/Message";
import MidiEvent from "@/core/midi/MidiEvent";
import { LaunchControlXL3 } from "@/core/midi/controllers/LaunchControlXL3";

const PLAY_CONTROL = 116;
const RECORD_CONTROL = 118;
const PAGE_UP_CONTROL = 106;
const PAGE_DOWN_CONTROL = 107;
const TRACK_PREV_CONTROL = 103;
const TRACK_NEXT_CONTROL = 102;

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
    vi.useRealTimers();
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

  it("removes listeners and clears pending animation timers on dispose", () => {
    vi.restoreAllMocks();
    vi.useFakeTimers();

    let inputListener: ((event: MidiEvent) => void) | undefined;
    const output = {
      send: vi.fn(),
    };
    const input = {
      addEventListener: vi.fn((listener: (event: MidiEvent) => void) => {
        inputListener = listener;
      }),
      removeEventListener: vi.fn(),
    };

    const controller = new LaunchControlXL3({
      input,
      output,
      onStart: vi.fn(),
      onStop: vi.fn(),
      isPlayingState: () => false,
    } as any);

    expect(inputListener).toBeDefined();

    output.send.mockClear();
    (controller as any).dispose();
    output.send.mockClear();

    vi.advanceTimersByTime(5000);

    expect(input.removeEventListener).toHaveBeenCalledTimes(1);
    expect(input.removeEventListener).toHaveBeenCalledWith(inputListener);
    expect(output.send).not.toHaveBeenCalled();
  });

  it("routes navigation controls to controller callbacks", async () => {
    let inputListener: ((event: MidiEvent) => void) | undefined;
    const onPageUp = vi.fn();
    const onPageDown = vi.fn();
    const onTrackPrev = vi.fn();
    const onTrackNext = vi.fn();
    const output = {
      send: vi.fn(),
    };
    const input = {
      addEventListener: vi.fn((listener: (event: MidiEvent) => void) => {
        inputListener = listener;
      }),
      removeEventListener: vi.fn(),
    };

    new LaunchControlXL3({
      input,
      output,
      onStart: vi.fn(),
      onStop: vi.fn(),
      isPlayingState: () => false,
      onPageUp,
      onPageDown,
      onTrackPrev,
      onTrackNext,
    } as any);

    expect(inputListener).toBeDefined();

    inputListener!(transportEvent(PAGE_UP_CONTROL, 127));
    inputListener!(transportEvent(PAGE_DOWN_CONTROL, 127));
    inputListener!(transportEvent(TRACK_PREV_CONTROL, 127));
    inputListener!(transportEvent(TRACK_NEXT_CONTROL, 127));
    await flushTasks();

    expect(onPageUp).toHaveBeenCalledTimes(1);
    expect(onPageDown).toHaveBeenCalledTimes(1);
    expect(onTrackPrev).toHaveBeenCalledTimes(1);
    expect(onTrackNext).toHaveBeenCalledTimes(1);
  });

  it("does not send SysEx messages during startup animation", () => {
    vi.restoreAllMocks();
    vi.useFakeTimers();

    const output = {
      send: vi.fn(),
    };
    const input = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    new LaunchControlXL3({
      input,
      output,
      onStart: vi.fn(),
      onStop: vi.fn(),
      isPlayingState: () => false,
    } as any);

    vi.advanceTimersByTime(5000);

    const sentMessages = output.send.mock.calls.map((call) => call[0]);
    const hasSysEx = sentMessages.some(
      (message) => Array.isArray(message) && message[0] === 0xf0,
    );

    expect(hasSysEx).toBe(false);
  });
});
