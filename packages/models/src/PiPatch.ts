import type { PiPatcherDocument } from "@blibliki/pi-patcher";
import { Optional, pick } from "@blibliki/utils";
import { merge } from "es-toolkit";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { getDb } from "./db";

export type IPiPatch = {
  id: string;
  name: string;
  userId: string;
  document: PiPatcherDocument;
};

const DEFAULT_PI_PATCH: IPiPatch = {
  id: "",
  name: "Untitled",
  userId: "",
  document: {
    version: "0.1.0",
    name: "Untitled",
    templateId: "pi-8-track-v1",
    hardwareProfileId: "launch-control-xl3-v1",
    globalBlock: { slots: [] },
    tracks: [],
  },
};

export default class PiPatch implements IPiPatch {
  id!: string;
  name!: string;
  userId!: string;
  document!: PiPatcherDocument;

  static build(data: Partial<IPiPatch> = {}): PiPatch {
    return new PiPatch(merge(merge({}, DEFAULT_PI_PATCH), data));
  }

  static async find(id: string): Promise<PiPatch> {
    const docRef = doc(getDb(), "piPatches", id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error(`PiPatch ${id} not found`);
    }

    return new PiPatch({ id: docSnap.id, ...docSnap.data() } as IPiPatch);
  }

  static async all(): Promise<PiPatch[]> {
    const querySnapshot = await getDocs(collection(getDb(), "piPatches"));
    return querySnapshot.docs.map(
      (document) =>
        new PiPatch({ id: document.id, ...document.data() } as IPiPatch),
    );
  }

  constructor(props: Optional<IPiPatch, "id">) {
    Object.assign(this, pick(props, ["id", "name", "userId", "document"]));
  }

  async save(): Promise<void> {
    if (this.id) {
      await updateDoc(this.docRef, this.props);
      return;
    }

    const docRef = await addDoc(collection(getDb(), "piPatches"), this.props);
    this.id = docRef.id;
  }

  async delete(): Promise<void> {
    if (!this.id) throw new Error("Cannot delete a Pi patch without id");
    await deleteDoc(this.docRef);
  }

  serialize(): IPiPatch {
    return {
      id: this.id,
      ...this.props,
    };
  }

  private get docRef() {
    return doc(getDb(), "piPatches", this.id);
  }

  private get props(): Omit<IPiPatch, "id"> {
    return {
      name: this.name,
      userId: this.userId,
      document: this.document,
    };
  }
}
