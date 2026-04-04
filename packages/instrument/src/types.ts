export type Fixed2<T> = [T, T];

export type Fixed8<T> = [T, T, T, T, T, T, T, T];

export type BlockKey =
  | "source"
  | "amp"
  | "filter"
  | "lfo1"
  | "fx1"
  | "fx2"
  | "fx3"
  | "fx4"
  | "trackGain";

export type TrackPageKey = "sourceAmp" | "filterMod" | "fx";

export type ValueSpec =
  | {
      kind: "number";
      min?: number;
      max?: number;
      step?: number;
      exp?: number;
    }
  | {
      kind: "enum";
      options: readonly (string | number)[];
    }
  | {
      kind: "boolean";
    };
