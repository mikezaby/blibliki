import { mediaKey, MediaInstanceState, MediaModuleState } from "@/core/media";

// What the players need from a video element and the browser, so tests can
// stand in for both.
export type MediaPlayer = {
  src: string;
  muted: boolean;
  loop: boolean;
  playsInline: boolean;
  playbackRate: number;
  readonly readyState: number;
  readonly duration: number;
  readonly paused: boolean;
  currentTime: number;
  play: () => Promise<void> | void;
  pause: () => void;
};

export type MediaDom = {
  createPlayer: () => MediaPlayer;
  createBitmap: (source: MediaPlayer | Blob) => Promise<ImageBitmap>;
  createUrl: (file: Blob) => string;
  revokeUrl: (url: string) => void;
  requestFrame: (callback: () => void) => number;
  cancelFrame: (handle: number) => void;
  now: () => number;
};

export const browserMediaDom: MediaDom = {
  createPlayer: () => document.createElement("video"),
  createBitmap: (source) => createImageBitmap(source as ImageBitmapSource),
  createUrl: (file) => URL.createObjectURL(file),
  revokeUrl: (url) => {
    URL.revokeObjectURL(url);
  },
  requestFrame: (callback) => requestAnimationFrame(callback),
  cancelFrame: (handle) => {
    cancelAnimationFrame(handle);
  },
  now: () => performance.now(),
};

type Player = {
  key: string;
  element: MediaPlayer;
  lastSeek: number;
  lastSeekAt: number;
  pumped: number;
  inFlight: boolean;
};

// Seeking every frame from a fast control would stall the decoder.
const SEEK_COOLDOWN_MS = 100;
const SEEK_STEP = 0.002;

// Decodes media where the DOM is. An image is uploaded once. A video gets
// a muted looping player per instance, driven by the state the worker
// reports, and each player's new frames go up as bitmaps while any player
// exists.
export class MediaPlayers {
  private urls = new Map<string, string>();
  private players = new Map<string, Player[]>();
  private frameHandle = 0;
  private disposed = false;

  constructor(
    private dom: MediaDom,
    private forward: (key: string, bitmap: ImageBitmap) => void,
  ) {}

  setFile(moduleId: string, file: Blob) {
    const url = this.urls.get(moduleId);
    if (url) this.dom.revokeUrl(url);
    this.urls.delete(moduleId);

    if (file.type.startsWith("image/")) {
      void this.dom.createBitmap(file).then((bitmap) => {
        if (this.disposed) bitmap.close();
        else this.forward(mediaKey(moduleId), bitmap);
      });
      return;
    }

    const next = this.dom.createUrl(file);
    this.urls.set(moduleId, next);
    for (const player of this.players.get(moduleId) ?? []) {
      player.element.src = next;
    }
  }

  apply(modules: MediaModuleState[]) {
    const seen = new Set<string>();
    for (const { id, instances } of modules) {
      seen.add(id);
      const list = this.players.get(id) ?? [];
      while (list.length < instances.length) {
        list.push(this.createPlayer(id, list.length));
      }
      while (list.length > instances.length) list.pop()?.element.pause();
      this.players.set(id, list);
      instances.forEach((state, instance) => {
        const player = list[instance];
        if (player) this.drive(player, state);
      });
    }
    for (const id of Array.from(this.players.keys())) {
      if (!seen.has(id)) this.dropPlayers(id);
    }
    this.schedule();
  }

  dispose() {
    this.disposed = true;
    if (this.frameHandle) this.dom.cancelFrame(this.frameHandle);
    for (const id of Array.from(this.players.keys())) this.dropPlayers(id);
    for (const url of this.urls.values()) this.dom.revokeUrl(url);
    this.urls.clear();
  }

  private createPlayer(moduleId: string, instance: number): Player {
    const element = this.dom.createPlayer();
    element.muted = true;
    element.loop = true;
    element.playsInline = true;
    element.src = this.urls.get(moduleId) ?? "";

    return {
      key: mediaKey(moduleId, instance),
      element,
      lastSeek: 0,
      lastSeekAt: -Infinity,
      pumped: -1,
      inFlight: false,
    };
  }

  private dropPlayers(moduleId: string) {
    for (const player of this.players.get(moduleId) ?? []) {
      player.element.pause();
      player.element.src = "";
    }
    this.players.delete(moduleId);
  }

  private drive(player: Player, { seek, speed, playing }: MediaInstanceState) {
    const { element } = player;
    if (element.playbackRate !== speed) element.playbackRate = speed;
    if (playing && element.paused) {
      void Promise.resolve(element.play()).catch(() => undefined);
    } else if (!playing && !element.paused) {
      element.pause();
    }

    const now = this.dom.now();
    if (
      Math.abs(seek - player.lastSeek) > SEEK_STEP &&
      now - player.lastSeekAt >= SEEK_COOLDOWN_MS &&
      Number.isFinite(element.duration) &&
      element.duration > 0
    ) {
      element.currentTime = seek * element.duration;
      player.lastSeek = seek;
      player.lastSeekAt = now;
    }
  }

  private schedule() {
    if (this.frameHandle || this.disposed) return;
    const any = Array.from(this.players.values()).some((l) => l.length > 0);
    if (!any) return;
    this.frameHandle = this.dom.requestFrame(this.pump);
  }

  // One bitmap in flight per player, and only when its frame moved.
  private pump = () => {
    this.frameHandle = 0;
    if (this.disposed) return;
    for (const list of this.players.values()) {
      for (const player of list) {
        const { element } = player;
        if (
          player.inFlight ||
          element.readyState < 2 ||
          element.currentTime === player.pumped
        ) {
          continue;
        }
        player.inFlight = true;
        const at = element.currentTime;
        void this.dom.createBitmap(element).then(
          (bitmap) => {
            player.inFlight = false;
            player.pumped = at;
            if (this.disposed) bitmap.close();
            else this.forward(player.key, bitmap);
          },
          () => {
            player.inFlight = false;
          },
        );
      }
    }
    this.schedule();
  };
}
