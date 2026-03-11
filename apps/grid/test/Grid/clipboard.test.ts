// @vitest-environment node
import { Engine, ModuleType } from "@blibliki/engine";
import { configureStore } from "@reduxjs/toolkit";
import { afterEach, describe, expect, it, vi } from "vitest";
import modulePropsReducer from "../../src/components/AudioModule/modulePropsSlice";
import moduleStateReducer from "../../src/components/AudioModule/moduleStateSlice";
import modulesReducer from "../../src/components/AudioModule/modulesSlice";
import {
  GRID_CLIPBOARD_MIME,
  GRID_CLIPBOARD_TEXT_PREFIX,
  buildGridClipboardSnapshot,
  pasteGridClipboardSnapshot,
  readGridClipboardSnapshotFromDataTransfer,
  remapModuleIdsInClipboardValue,
  writeGridClipboardSnapshotToDataTransfer,
} from "../../src/components/Grid/clipboard";
import gridNodesReducer from "../../src/components/Grid/gridNodesSlice";
import { store } from "../../src/store";
import type { RootState } from "../../src/store";

const createClipboardStore = (preloadedState?: {
  gridNodes?: {
    nodes: RootState["gridNodes"]["nodes"];
    edges: RootState["gridNodes"]["edges"];
    viewport: RootState["gridNodes"]["viewport"];
  };
}) =>
  configureStore({
    reducer: {
      modules: modulesReducer,
      moduleProps: modulePropsReducer,
      moduleState: moduleStateReducer,
      gridNodes: gridNodesReducer,
    },
    preloadedState,
    devTools: false,
  });

const createDataTransfer = () => {
  const data = new Map<string, string>();

  return {
    data,
    transfer: {
      getData: vi.fn((type: string) => data.get(type) ?? ""),
      setData: vi.fn((type: string, value: string) => {
        data.set(type, value);
      }),
    },
  };
};

const clipboardSnapshotFixture = {
  modules: [
    {
      originalId: "osc-1",
      name: "Oscillator",
      moduleType: ModuleType.Oscillator,
      props: { lowGain: true },
      position: { x: 40, y: 50 },
    },
  ],
  routes: [],
} as const;

describe("grid clipboard", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serializes selected modules and only the routes between them", () => {
    const baseState = store.getState();
    const state = {
      ...baseState,
      modules: {
        ids: ["osc-1", "gain-1", "output-1"],
        entities: {
          "osc-1": {
            id: "osc-1",
            name: "Oscillator",
            moduleType: ModuleType.Oscillator,
            voiceNo: 0,
            inputs: [],
            outputs: [],
          },
          "gain-1": {
            id: "gain-1",
            name: "Gain",
            moduleType: ModuleType.Gain,
            voiceNo: 0,
            voices: 8,
            inputs: [],
            outputs: [],
          },
          "output-1": {
            id: "output-1",
            name: "Master",
            moduleType: ModuleType.Master,
            voiceNo: 0,
            inputs: [],
            outputs: [],
          },
        },
      },
      moduleProps: {
        ids: ["osc-1", "gain-1", "output-1"],
        entities: {
          "osc-1": { id: "osc-1", props: { lowGain: true } },
          "gain-1": { id: "gain-1", props: { gain: 0.5 } },
          "output-1": { id: "output-1", props: {} },
        },
      },
      moduleState: {
        ids: [],
        entities: {},
      },
      gridNodes: {
        nodes: [
          {
            id: "osc-1",
            type: "audioNode",
            position: { x: 40, y: 50 },
            data: {},
            selected: true,
          },
          {
            id: "gain-1",
            type: "audioNode",
            position: { x: 220, y: 50 },
            data: {},
            selected: true,
          },
          {
            id: "output-1",
            type: "audioNode",
            position: { x: 420, y: 50 },
            data: {},
          },
        ],
        edges: [
          {
            id: "route-1",
            source: "osc-1",
            sourceHandle: "out",
            target: "gain-1",
            targetHandle: "in",
          },
          {
            id: "route-2",
            source: "gain-1",
            sourceHandle: "out",
            target: "output-1",
            targetHandle: "in",
          },
        ],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    } as RootState;

    expect(buildGridClipboardSnapshot(state)).toEqual({
      modules: [
        {
          originalId: "osc-1",
          name: "Oscillator",
          moduleType: ModuleType.Oscillator,
          props: { lowGain: true },
          position: { x: 40, y: 50 },
        },
        {
          originalId: "gain-1",
          name: "Gain",
          moduleType: ModuleType.Gain,
          voices: 8,
          props: { gain: 0.5 },
          position: { x: 220, y: 50 },
        },
      ],
      routes: [
        {
          sourceModuleId: "osc-1",
          sourceHandle: "out",
          targetModuleId: "gain-1",
          targetHandle: "in",
        },
      ],
    });
  });

  it("remaps nested moduleId values for copied module props", () => {
    const remapped = remapModuleIdsInClipboardValue(
      {
        tracks: [
          {
            name: "Track 1",
            mappings: [
              {
                moduleId: "osc-1",
                moduleType: ModuleType.Oscillator,
                propName: "detune",
              },
            ],
          },
        ],
      },
      new Map([["osc-1", "osc-copy-1"]]),
    );

    expect(remapped).toEqual({
      tracks: [
        {
          name: "Track 1",
          mappings: [
            {
              moduleId: "osc-copy-1",
              moduleType: ModuleType.Oscillator,
              propName: "detune",
            },
          ],
        },
      ],
    });
  });

  it("writes clipboard snapshots to both custom mime and text fallback", () => {
    const { transfer } = createDataTransfer();

    writeGridClipboardSnapshotToDataTransfer(
      transfer,
      clipboardSnapshotFixture,
    );

    expect(transfer.setData).toHaveBeenCalledWith(
      GRID_CLIPBOARD_MIME,
      expect.any(String),
    );
    expect(transfer.setData).toHaveBeenCalledWith(
      "text/plain",
      expect.stringContaining(GRID_CLIPBOARD_TEXT_PREFIX),
    );
  });

  it("reads clipboard snapshots back from the text fallback and ignores foreign text", () => {
    const { data, transfer } = createDataTransfer();
    writeGridClipboardSnapshotToDataTransfer(
      transfer,
      clipboardSnapshotFixture,
    );

    const textFallback = data.get("text/plain");
    expect(textFallback).toBeDefined();

    const fallbackOnlyTransfer = {
      getData: vi.fn((type: string) => {
        if (type === GRID_CLIPBOARD_MIME) return "";
        if (type === "text/plain") return textFallback ?? "";

        return "";
      }),
    };

    expect(
      readGridClipboardSnapshotFromDataTransfer(fallbackOnlyTransfer),
    ).toEqual(clipboardSnapshotFixture);

    const foreignTransfer = {
      getData: vi.fn((type: string) => {
        if (type === "text/plain") return "not a blibliki clipboard payload";

        return "";
      }),
    };

    expect(
      readGridClipboardSnapshotFromDataTransfer(foreignTransfer),
    ).toBeNull();
  });

  it("clones modules with an offset and recreates copied routes with new ids", () => {
    const clipboardStore = createClipboardStore();

    const engineAddModule = vi
      .fn()
      .mockImplementationOnce((params: { props: { lowGain: boolean } }) => ({
        id: "osc-copy-1",
        name: "Oscillator",
        moduleType: ModuleType.Oscillator,
        voiceNo: 0,
        props: params.props,
        inputs: [],
        outputs: [],
      }))
      .mockImplementationOnce((params: { props: { gain: number } }) => ({
        id: "gain-copy-1",
        name: "Gain",
        moduleType: ModuleType.Gain,
        voiceNo: 0,
        props: params.props,
        inputs: [],
        outputs: [],
      }));
    const engineAddRoute = vi.fn().mockReturnValue({ id: "route-copy-1" });

    vi.spyOn(Engine, "current", "get").mockReturnValue({
      addModule: engineAddModule,
      addRoute: engineAddRoute,
    } as unknown as Engine);

    clipboardStore.dispatch(
      pasteGridClipboardSnapshot({
        modules: [
          {
            originalId: "osc-1",
            name: "Oscillator",
            moduleType: ModuleType.Oscillator,
            props: { lowGain: true },
            position: { x: 40, y: 50 },
          },
          {
            originalId: "gain-1",
            name: "Gain",
            moduleType: ModuleType.Gain,
            props: { gain: 0.5 },
            position: { x: 220, y: 50 },
          },
        ],
        routes: [
          {
            sourceModuleId: "osc-1",
            sourceHandle: "out",
            targetModuleId: "gain-1",
            targetHandle: "in",
          },
        ],
      }),
    );

    expect(engineAddModule).toHaveBeenNthCalledWith(1, {
      name: "Oscillator",
      moduleType: ModuleType.Oscillator,
      props: { lowGain: true },
    });
    expect(engineAddModule).toHaveBeenNthCalledWith(2, {
      name: "Gain",
      moduleType: ModuleType.Gain,
      props: { gain: 0.5 },
    });
    expect(engineAddRoute).toHaveBeenCalledWith({
      source: { moduleId: "osc-copy-1", ioName: "out" },
      destination: { moduleId: "gain-copy-1", ioName: "in" },
    });

    const state = clipboardStore.getState();
    expect(state.gridNodes.nodes).toEqual([
      expect.objectContaining({
        id: "osc-copy-1",
        position: { x: 88, y: 98 },
      }),
      expect.objectContaining({
        id: "gain-copy-1",
        position: { x: 268, y: 98 },
      }),
    ]);
    expect(state.gridNodes.edges).toEqual([
      expect.objectContaining({
        id: "route-copy-1",
        source: "osc-copy-1",
        sourceHandle: "out",
        target: "gain-copy-1",
        targetHandle: "in",
      }),
    ]);
  });

  it("anchors pasted modules at the cursor and selects the pasted group", () => {
    const clipboardStore = createClipboardStore({
      gridNodes: {
        nodes: [
          {
            id: "existing-1",
            type: "audioNode",
            position: { x: 0, y: 0 },
            data: {},
            selected: true,
          },
        ],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    });

    const engineAddModule = vi
      .fn()
      .mockImplementationOnce((params: { props: { lowGain: boolean } }) => ({
        id: "osc-copy-2",
        name: "Oscillator",
        moduleType: ModuleType.Oscillator,
        voiceNo: 0,
        props: params.props,
        inputs: [],
        outputs: [],
      }))
      .mockImplementationOnce((params: { props: { gain: number } }) => ({
        id: "gain-copy-2",
        name: "Gain",
        moduleType: ModuleType.Gain,
        voiceNo: 0,
        props: params.props,
        inputs: [],
        outputs: [],
      }));

    vi.spyOn(Engine, "current", "get").mockReturnValue({
      addModule: engineAddModule,
      addRoute: vi.fn().mockReturnValue({ id: "route-copy-2" }),
    } as unknown as Engine);

    clipboardStore.dispatch(
      pasteGridClipboardSnapshot(
        {
          modules: [
            {
              originalId: "osc-1",
              name: "Oscillator",
              moduleType: ModuleType.Oscillator,
              props: { lowGain: true },
              position: { x: 40, y: 50 },
            },
            {
              originalId: "gain-1",
              name: "Gain",
              moduleType: ModuleType.Gain,
              props: { gain: 0.5 },
              position: { x: 220, y: 50 },
            },
          ],
          routes: [],
        },
        {
          anchorPosition: { x: 400, y: 300 },
        },
      ),
    );

    expect(clipboardStore.getState().gridNodes.nodes).toEqual([
      expect.objectContaining({
        id: "existing-1",
        selected: false,
      }),
      expect.objectContaining({
        id: "osc-copy-2",
        position: { x: 310, y: 300 },
        selected: true,
      }),
      expect.objectContaining({
        id: "gain-copy-2",
        position: { x: 490, y: 300 },
        selected: true,
      }),
    ]);
  });
});
