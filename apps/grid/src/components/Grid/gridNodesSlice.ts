import { Engine, IRoute } from "@blibliki/engine";
import { uuidv4 } from "@blibliki/utils";
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
import {
  addVideoRoute,
  removeVideoModule,
  removeVideoRoute,
} from "@/video/videoPatchSlice";

export type IGridNodes = {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
};

export const isVideoNode = (node: Pick<Node, "type">) =>
  node.type === "videoNode";
export const videoNodeIds = (nodes: Node[]) =>
  new Set(nodes.filter(isVideoNode).map((node) => node.id));

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
    applyEdgeChanges: (state, action: PayloadAction<EdgeChange[]>) => {
      state.edges = applyGridEdgeChanges(action.payload, state.edges);
    },
    addEdge: (state, action: PayloadAction<Edge>) => {
      state.edges = addGridEdge(action.payload, state.edges);
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
  applyEdgeChanges,
  addEdge,
  onConnect,
  setViewport,
} = gridNodesSlice.actions;

export const onNodesChange =
  (changes: NodeChange[]) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const { nodes } = getState().gridNodes;
    dispatch(setNodes(applyGridNodeChanges(changes, structuredClone(nodes))));

    changes.forEach((change) => {
      if (change.type !== "remove") return;

      const node = nodes.find((candidate) => candidate.id === change.id);
      dispatch(
        node && isVideoNode(node)
          ? removeVideoModule(change.id)
          : removeModule(change.id),
      );
    });
  };

export const onEdgesChange =
  (changes: EdgeChange[]) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const { nodes, edges } = getState().gridNodes;
    const video = videoNodeIds(nodes);

    changes.forEach((change) => {
      if (change.type !== "remove") return;

      const edge = edges.find((candidate) => candidate.id === change.id);
      if (edge && video.has(edge.source)) {
        dispatch(removeVideoRoute(change.id));
      } else {
        Engine.current.removeRoute(change.id);
      }
    });

    dispatch(applyEdgeChanges(changes));
  };

export const connect =
  (connection: Connection) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const video = videoNodeIds(getState().gridNodes.nodes);
    const { source, target } = connection;
    if (source && target && video.has(source) && video.has(target)) {
      const id = uuidv4();
      dispatch(addVideoRoute({ id, ...connectionToRoute(connection) }));
      dispatch(addEdge({ id, ...connection }));
      return;
    }

    dispatch(onConnect(connection));
  };

export function hydrateEngineRoutes(gridNodes: IGridNodes) {
  const video = videoNodeIds(gridNodes.nodes);

  gridNodes.edges.forEach((edge) => {
    if (video.has(edge.source)) return;

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
          node.id === change.id ? { ...node, selected: change.selected } : node,
        );
        break;
      case "position":
        nextNodes = nextNodes.map((node) =>
          node.id === change.id
            ? {
                ...node,
                position: change.position ?? node.position,
                dragging: change.dragging ?? node.dragging,
              }
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

          return nextNode;
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
          edge.id === change.id ? { ...edge, selected: change.selected } : edge,
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
