import { Engine, IRoute } from "@blibliki/engine";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  Viewport,
} from "@xyflow/react";
import { removeModule } from "@/components/AudioModule/modulesSlice";
import { AppDispatch, RootState } from "@/store";

export type IGridNodes = {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
};

const initialState: IGridNodes = {
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
};

export const gridNodesSlice = createSlice({
  name: "gridNodes",
  initialState,
  reducers: {
    setGridNodes: (_, action: PayloadAction<IGridNodes>) => {
      hydrateEngineRoutes(action.payload);
      return action.payload;
    },
    removeAllGridNodes: () => {
      return { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } };
    },
    setNodes: (state, action: PayloadAction<Node[]>) => {
      state.nodes = action.payload;
    },
    addNode: (state, action: PayloadAction<Node>) => {
      state.nodes.push(action.payload);
    },
    selectOnlyNodes: (state, action: PayloadAction<string[]>) => {
      const selectedIds = new Set(action.payload);

      state.nodes = state.nodes.map((node) => ({
        ...node,
        selected: selectedIds.has(node.id),
      }));
      state.edges = state.edges.map((edge) => ({
        ...edge,
        selected: false,
      }));
    },
    onEdgesChange: (state, action: PayloadAction<EdgeChange[]>) => {
      const changes = action.payload;
      state.edges = applyGridEdgeChanges(changes, state.edges);

      changes.forEach((change) => {
        if (change.type !== "remove") return;

        Engine.current.removeRoute(change.id);
      });
    },
    onConnect: (state, action: PayloadAction<Connection>) => {
      const route = Engine.current.addRoute(connectionToRoute(action.payload));
      state.edges = addGridEdge(
        { id: route.id, ...action.payload },
        state.edges,
      );
    },
    setViewport: (state, action: PayloadAction<Viewport>) => {
      state.viewport = action.payload;
    },
  },
});

export const { setNodes } = gridNodesSlice.actions;

export const {
  setGridNodes,
  removeAllGridNodes,
  addNode,
  selectOnlyNodes,
  onEdgesChange,
  onConnect,
  setViewport,
} = gridNodesSlice.actions;

export const onNodesChange =
  (changes: NodeChange[]) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const nodes = structuredClone(getState().gridNodes.nodes);
    dispatch(setNodes(applyGridNodeChanges(changes, nodes)));

    changes.forEach((change) => {
      if (change.type !== "remove") return;

      dispatch(removeModule(change.id));
    });
  };

export function hydrateEngineRoutes(gridNodes: IGridNodes) {
  gridNodes.edges.forEach((edge) => {
    const route: IRoute = {
      id: edge.id,
      ...connectionToRoute(edge as Connection),
    };
    Engine.current.addRoute(route);
  });
}

function connectionToRoute(connection: Connection): Omit<IRoute, "id"> {
  const {
    source: sourceId,
    sourceHandle: sourceIOId,
    target: destinationId,
    targetHandle: destinationIOId,
  } = connection;

  if (!sourceId || !sourceIOId || !destinationId || !destinationIOId)
    throw Error("Some value is null");

  return {
    source: { moduleId: sourceId, ioName: sourceIOId },
    destination: { moduleId: destinationId, ioName: destinationIOId },
  };
}

function addGridEdge<EdgeType extends Edge>(
  edge: EdgeType,
  edges: EdgeType[],
): EdgeType[] {
  return [...edges, edge];
}

function applyGridNodeChanges<NodeType extends Node>(
  changes: NodeChange<NodeType>[],
  nodes: NodeType[],
): NodeType[] {
  let nextNodes = [...nodes];

  changes.forEach((change) => {
    switch (change.type) {
      case "add":
        nextNodes = insertAtIndex(nextNodes, change.item, change.index);
        break;
      case "remove":
        nextNodes = nextNodes.filter((node) => node.id !== change.id);
        break;
      case "replace":
        nextNodes = nextNodes.map((node) =>
          node.id === change.id ? change.item : node,
        );
        break;
      case "select":
        nextNodes = nextNodes.map((node) =>
          node.id === change.id
            ? ({ ...node, selected: change.selected } as NodeType)
            : node,
        );
        break;
      case "position":
        nextNodes = nextNodes.map((node) =>
          node.id === change.id
            ? ({
                ...node,
                position: change.position ?? node.position,
                dragging: change.dragging ?? node.dragging,
              } as NodeType)
            : node,
        );
        break;
      case "dimensions":
        nextNodes = nextNodes.map((node) => {
          if (node.id !== change.id) return node;

          const nextNode = {
            ...node,
            measured: {
              ...node.measured,
              ...change.dimensions,
            },
            resizing: change.resizing ?? node.resizing,
          };

          if (
            change.setAttributes === true ||
            change.setAttributes === "width"
          ) {
            nextNode.width = change.dimensions?.width ?? node.width;
          }

          if (
            change.setAttributes === true ||
            change.setAttributes === "height"
          ) {
            nextNode.height = change.dimensions?.height ?? node.height;
          }

          return nextNode as NodeType;
        });
        break;
    }
  });

  return nextNodes;
}

function applyGridEdgeChanges<EdgeType extends Edge>(
  changes: EdgeChange<EdgeType>[],
  edges: EdgeType[],
): EdgeType[] {
  let nextEdges = [...edges];

  changes.forEach((change) => {
    switch (change.type) {
      case "add":
        nextEdges = insertAtIndex(nextEdges, change.item, change.index);
        break;
      case "remove":
        nextEdges = nextEdges.filter((edge) => edge.id !== change.id);
        break;
      case "replace":
        nextEdges = nextEdges.map((edge) =>
          edge.id === change.id ? change.item : edge,
        );
        break;
      case "select":
        nextEdges = nextEdges.map((edge) =>
          edge.id === change.id
            ? ({ ...edge, selected: change.selected } as EdgeType)
            : edge,
        );
        break;
    }
  });

  return nextEdges;
}

function insertAtIndex<T>(items: T[], item: T, index?: number): T[] {
  if (index === undefined || index < 0 || index >= items.length) {
    return [...items, item];
  }

  return [...items.slice(0, index), item, ...items.slice(index)];
}

export default gridNodesSlice.reducer;
