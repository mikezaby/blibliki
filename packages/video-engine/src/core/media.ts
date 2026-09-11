// A frame the host uploads for a module, per instance for a video.
export const mediaKey = (moduleId: string, instance?: number) =>
  instance === undefined
    ? `media:${moduleId}`
    : `media:${moduleId}:${instance}`;

export type MediaInstanceState = {
  seek: number;
  speed: number;
  playing: boolean;
};

// What the host needs to drive one Video module's players.
export type MediaModuleState = { id: string; instances: MediaInstanceState[] };
