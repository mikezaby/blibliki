import { Optional, pick } from "@blibliki/utils";
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

export type SerializedInstrumentDocument = Record<string, unknown>;

export type IInstrument = {
  id: string;
  name: string;
  userId: string;
  document: SerializedInstrumentDocument;
};

export default class Instrument implements IInstrument {
  id!: string;
  name!: string;
  userId!: string;
  document!: SerializedInstrumentDocument;

  static async find(id: string): Promise<Instrument> {
    const db = getDb();

    const docRef = doc(db, "instruments", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = { id: docSnap.id, ...docSnap.data() } as IInstrument;
      return new Instrument(data);
    }

    throw Error(`Instrument ${id} not found`);
  }

  static async all(): Promise<Instrument[]> {
    const db = getDb();
    const querySnapshot = await getDocs(collection(db, "instruments"));

    return querySnapshot.docs.map((snapshot) => {
      return new Instrument({
        id: snapshot.id,
        ...snapshot.data(),
      } as IInstrument);
    });
  }

  constructor(props: Optional<IInstrument, "id">) {
    Object.assign(this, pick(props, ["id", "name", "userId", "document"]));
  }

  async save(): Promise<void> {
    const db = getDb();

    if (this.id) {
      await updateDoc(this.docRef, this.props);
    } else {
      const docRef = await addDoc(collection(db, "instruments"), this.props);
      this.id = docRef.id;
    }
  }

  async delete(): Promise<void> {
    if (!this.id) {
      throw Error("Cannot delete an instrument without id");
    }

    await deleteDoc(this.docRef);
  }

  serialize(): IInstrument {
    return {
      id: this.id,
      ...this.props,
    };
  }

  private get docRef() {
    const db = getDb();
    return doc(db, "instruments", this.id);
  }

  private get props(): Omit<IInstrument, "id"> {
    return {
      name: this.name,
      userId: this.userId,
      document: this.document,
    };
  }
}
