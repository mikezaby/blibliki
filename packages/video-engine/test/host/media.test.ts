import { describe, expect, it, vi } from "vitest";
import { MediaDom, MediaPlayer, MediaPlayers } from "@/host/media";

type FakePlayer = MediaPlayer & { readyState: number; duration: number };

function fakeDom() {
  const players: FakePlayer[] = [];
  let frame: (() => void) | null = null;
  let clock = 0;
  const dom: MediaDom = {
    createPlayer: () => {
      const player: FakePlayer = {
        src: "",
        muted: false,
        loop: false,
        playsInline: false,
        playbackRate: 1,
        readyState: 0,
        duration: NaN,
        paused: true,
        currentTime: 0,
        play() {
          (player as { paused: boolean }).paused = false;
        },
        pause() {
          (player as { paused: boolean }).paused = true;
        },
      };
      players.push(player);
      return player;
    },
    createBitmap: vi.fn(() =>
      Promise.resolve({ close: vi.fn() } as unknown as ImageBitmap),
    ),
    createUrl: vi.fn(() => "blob:video"),
    revokeUrl: vi.fn(),
    requestFrame: (callback) => {
      frame = callback;
      return 1;
    },
    cancelFrame: () => {
      frame = null;
    },
    now: () => clock,
  };
  const tick = () => {
    const cb = frame;
    frame = null;
    cb?.();
  };
  const advance = (ms: number) => {
    clock += ms;
  };
  const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  return { dom, players, tick, advance, flush };
}

const file = (type: string) => ({ type }) as Blob;

describe("MediaPlayers", () => {
  it("uploads an image once under the module's key", async () => {
    const { dom, flush } = fakeDom();
    const forward = vi.fn();
    const media = new MediaPlayers(dom, forward);

    media.setFile("img", file("image/png"));
    await flush();

    expect(forward).toHaveBeenCalledWith("media:img", expect.anything());
    expect(dom.createUrl).not.toHaveBeenCalled();
  });

  it("runs a muted looping player per instance and uploads each new frame", async () => {
    const { dom, players, tick, flush } = fakeDom();
    const forward = vi.fn();
    const media = new MediaPlayers(dom, forward);

    media.setFile("vid", file("video/mp4"));
    media.apply([
      {
        id: "vid",
        instances: [
          { seek: 0, speed: 1, playing: true },
          { seek: 0, speed: 1.5, playing: false },
        ],
      },
    ]);

    expect(players).toHaveLength(2);
    expect(players[0]).toMatchObject({
      src: "blob:video",
      muted: true,
      loop: true,
      paused: false,
    });
    expect(players[1]).toMatchObject({ playbackRate: 1.5, paused: true });

    players[0]!.readyState = 2;
    players[0]!.currentTime = 0.5;
    tick();
    await flush();
    tick();
    await flush();

    expect(forward).toHaveBeenCalledTimes(1);
    expect(forward).toHaveBeenCalledWith("media:vid:0", expect.anything());
  });

  it("seeks an instance to its fraction of the file, at most every 100 ms", () => {
    const { dom, players, advance } = fakeDom();
    const media = new MediaPlayers(dom, vi.fn());
    const state = (seek: number) => [
      { id: "vid", instances: [{ seek, speed: 1, playing: true }] },
    ];

    media.setFile("vid", file("video/mp4"));
    media.apply(state(0.5));
    players[0]!.duration = 10;
    advance(200);
    media.apply(state(0.5));

    expect(players[0]!.currentTime).toBe(5);

    media.apply(state(0.9));

    expect(players[0]!.currentTime).toBe(5);

    advance(200);
    media.apply(state(0.9));

    expect(players[0]!.currentTime).toBe(9);
  });

  it("drops the players of a module that is gone and revokes urls on dispose", () => {
    const { dom, players } = fakeDom();
    const media = new MediaPlayers(dom, vi.fn());

    media.setFile("vid", file("video/mp4"));
    media.apply([
      { id: "vid", instances: [{ seek: 0, speed: 1, playing: true }] },
    ]);
    media.apply([]);

    expect(players[0]).toMatchObject({ paused: true, src: "" });

    media.dispose();

    expect(dom.revokeUrl).toHaveBeenCalledWith("blob:video");
  });
});
