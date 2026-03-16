import type { InstrumentDocument } from "@blibliki/instrument";
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

export type IInstrument = {
  id: string;
  name: string;
  userId: string;
  document: InstrumentDocument;
};

const INSTRUMENT_COLLECTION = "instruments";

const DEFAULT_INSTRUMENT: IInstrument = {
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

export default class Instrument implements IInstrument {
  id!: string;
  name!: string;
  userId!: string;
  document!: InstrumentDocument;

  static build(data: Partial<IInstrument> = {}): Instrument {
    return new Instrument(merge(merge({}, DEFAULT_INSTRUMENT), data));
  }

  static async find(id: string): Promise<Instrument> {
    const docRef = doc(getDb(), INSTRUMENT_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return new Instrument({
        id: docSnap.id,
        ...docSnap.data(),
      } as IInstrument);
    }

    throw new Error(`Instrument ${id} not found`);
  }

  static async all(): Promise<Instrument[]> {
    const querySnapshot = await getDocs(
      collection(getDb(), INSTRUMENT_COLLECTION),
    );
    return querySnapshot.docs.map(
      (document) =>
        new Instrument({ id: document.id, ...document.data() } as IInstrument),
    );
  }

  constructor(props: Optional<IInstrument, "id">) {
    Object.assign(this, pick(props, ["id", "name", "userId", "document"]));
  }

  async save(): Promise<void> {
    if (this.id) {
      await updateDoc(this.docRef, this.props);
      return;
    }

    const docRef = await addDoc(
      collection(getDb(), INSTRUMENT_COLLECTION),
      this.props,
    );
    this.id = docRef.id;
  }

  async delete(): Promise<void> {
    if (!this.id) throw new Error("Cannot delete an instrument without id");
    await deleteDoc(this.docRef);
  }

  serialize(): IInstrument {
    return {
      id: this.id,
      ...this.props,
    };
  }

  private get docRef() {
    return doc(getDb(), INSTRUMENT_COLLECTION, this.id);
  }

  private get props(): Omit<IInstrument, "id"> {
    return {
      name: this.name,
      userId: this.userId,
      document: this.document,
    };
  }
}
