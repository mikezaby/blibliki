export type PiDisplayCell = {
  label: string;
  value: string;
  active: boolean;
};

export type PiDisplayState = {
  header: {
    patchName: string;
    trackName: string;
    pageName: string;
    transport: string;
  };
  globals: PiDisplayCell[];
  upper: {
    title: string;
    cells: PiDisplayCell[];
  };
  lower: {
    title: string;
    cells: PiDisplayCell[];
  };
  seqEdit?: {
    page: number;
    step: number;
    selected: number;
  };
};
