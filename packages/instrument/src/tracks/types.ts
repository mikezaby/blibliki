import type { BlockIOKind, SerializedBlock } from "@/blocks/types";
import type { Page } from "@/pages/Page";
import type { BlockKey } from "@/types";

export type BaseTrackOptions = {
  voices: number;
  midiChannel: number;
};

export type TrackPlug = {
  blockKey: BlockKey;
  ioName: string;
};

export type TrackRoute = {
  id: string;
  source: TrackPlug;
  destination: TrackPlug;
};

export type CreateTrackRoute = Omit<TrackRoute, "id"> & {
  id?: string;
};

export type TrackIO = {
  ioName: string;
  kind: BlockIOKind;
  plugs: TrackPlug[];
};

export type CreateTrackIO = TrackIO;

export type SerializedTrack = {
  key: string;
  voices: number;
  midiChannel: number;
  blocks: SerializedBlock[];
  routes: TrackRoute[];
  pages: Page[];
  inputs: TrackIO[];
  outputs: TrackIO[];
};
