import { Engine, IRoute } from "@blibliki/engine";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
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
      action.payload.edges.forEach((edge) => {
        const route: IRoute = {
          id: edge.id,
          ...connectionToRoute(edge as Connection),
        };
        Engine.current.addRoute(route);
      });
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
    onEdgesChange: (state, action: PayloadAction<EdgeChange[]>) => {
      const changes = action.payload;
      state.edges = applyEdgeChanges(changes, state.edges);

      changes.forEach((change) => {
        if (change.type !== "remove") return;

        Engine.current.removeRoute(change.id);
      });
    },
    onConnect: (state, action: PayloadAction<Connection>) => {
      const route = Engine.current.addRoute(connectionToRoute(action.payload));
      state.edges = addEdge({ id: route.id, ...action.payload }, state.edges);
    },
    setViewport: (state, action: PayloadAction<Viewport>) => {
      state.viewport = action.payload;
    },
  },
});

const { setNodes } = gridNodesSlice.actions;

export const {
  setGridNodes,
  removeAllGridNodes,
  addNode,
  onEdgesChange,
  onConnect,
  setViewport,
} = gridNodesSlice.actions;

export const onNodesChange =
  (changes: NodeChange[]) =>
  (dispatch: AppDispatch, getState: () => RootState) => {
    const nodes = getState().gridNodes.nodes;
    dispatch(setNodes(applyNodeChanges(changes, nodes)));

    changes.forEach((change) => {
      if (change.type !== "remove") return;

      dispatch(removeModule(change.id));
    });
  };

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

export default gridNodesSlice.reducer;
