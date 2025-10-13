import { pick } from "@blibliki/utils";
import {
  collection,
  addDoc,
  getDoc,
  doc,
  updateDoc,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { ModuleProps } from "@/components/AudioModule/modulesSlice";
import { IGridNodes } from "@/components/Grid/gridNodesSlice";
import { Optional } from "@/types";
import { db, getDb } from "./db";

export type IPatch = {
  id: string;
  name: string;
  userId: string;
  config: IConfig;
}

export type IConfig = {
  modules: ModuleProps[];
  gridNodes: IGridNodes;
}

export default class Patch implements IPatch {
  id!: string;
  name!: string;
  userId!: string;
  config!: IConfig;

  static async find(id: string): Promise<Patch> {
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
    if (this.id) throw Error("Cannot delete a patch without id");

    await deleteDoc(this.docRef);
  }

  serialize(): IPatch {
    return {
      id: this.id,
      ...this.props,
    };
  }

  private get docRef() {
    return doc(db, "patches", this.id);
  }

  private get props(): Omit<IPatch, "id"> {
    return { name: this.name, userId: this.userId, config: this.config };
  }
}
