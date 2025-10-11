import { create } from "zustand";

export type ExampleKey = "example1" | "filter";

export interface ExampleMeta {
  key: ExampleKey;
  label: string;
  description?: string;
}

const exampleRegistry: Record<ExampleKey, () => Promise<() => void>> = {
  example1: () => import("./example1").then((m) => m.load),
  filter: () => import("./filter").then((m) => m.load),
};

export const exampleList: ExampleMeta[] = [
  { key: "example1", label: "Oscillator → Gain → Master" },
  { key: "filter", label: "Filter" },
];

interface ExampleState {
  currentExample: ExampleKey | null;
  setExample: (key: ExampleKey) => Promise<void>;
}

export const useExample = create<ExampleState>((set, get) => ({
  currentExample: null,

  setExample: async (key) => {
    const { currentExample } = get();
    if (currentExample === key) return;

    set({ currentExample: key });

    const loadFn = await exampleRegistry[key]();
    loadFn();
  },
}));
