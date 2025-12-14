import {
  IAnyModuleSerialize,
  IEngineSerialize,
  IRoute,
} from "@blibliki/engine";
import { AnyObject, Optional, pick } from "@blibliki/utils";
import {
  collection,
  addDoc,
  getDoc,
  doc,
  updateDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { getDb } from "./db";

export type IPatch = {
  id: string;
  name: string;
  userId: string;
  config: IConfig;
};

type Viewport = {
  x: number;
  y: number;
  zoom: number;
};

type Node = {
  data: AnyObject;
  dragging?: boolean;
  id: string;
  measured?: {
    height?: number;
    width?: number;
  };
  position: {
    x: number;
    y: number;
  };
  selected?: boolean;
  type?: string;
};

type Edge = {
  id: string;
  source: string;
  sourceHandle?: string | null;
  target: string;
  targetHandle?: string | null;
};

type IGridNodes = {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
};

export type IConfig = {
  modules: IAnyModuleSerialize[];
  gridNodes: IGridNodes;
};

export default class Patch implements IPatch {
  id!: string;
  name!: string;
  userId!: string;
  config!: IConfig;

  static async find(id: string): Promise<Patch> {
    const db = getDb();

    const docRef = doc(db, "patches", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = { id: docSnap.id, ...docSnap.data() } as IPatch;
      return new Patch(data);
    } else {
      throw Error(`Patch ${id} not found`);
    }
  }

  static async all(): Promise<Patch[]> {
    const db = getDb();

    const querySnapshot = await getDocs(collection(db, "patches"));

    return querySnapshot.docs.map((doc) => {
      return new Patch({
        id: doc.id,
        ...doc.data(),
      } as IPatch);
    });
  }

  constructor(props: Optional<IPatch, "id">) {
    Object.assign(this, pick(props, ["id", "name", "userId", "config"]));
  }

  async save(): Promise<void> {
    const db = getDb();

    if (this.id) {
      await updateDoc(this.docRef, this.props);
    } else {
      const docRef = await addDoc(collection(db, "patches"), this.props);
      this.id = docRef.id;
    }
  }

  async delete(): Promise<void> {
    if (!this.id) throw Error("Cannot delete a patch without id");

    await deleteDoc(this.docRef);
  }

  serialize(): IPatch {
    return {
      id: this.id,
      ...this.props,
    };
  }

  engineSerialize(): IEngineSerialize {
    const { modules, gridNodes } = this.props.config;

    const routes: IRoute[] = gridNodes.edges.map((edge) => {
      return {
        id: edge.id,
        source: { moduleId: edge.source, ioName: edge.sourceHandle! },
        destination: { moduleId: edge.target, ioName: edge.targetHandle! },
      };
    });

    return {
      bpm: 120, // Temp: static until I set it from grid
      timeSignature: [4, 4], // Temp: static until I set it from grid
      modules,
      routes,
    };
  }

  private get docRef() {
    const db = getDb();

    return doc(db, "patches", this.id);
  }

  private get props(): Omit<IPatch, "id"> {
    return { name: this.name, userId: this.userId, config: this.config };
  }
}
