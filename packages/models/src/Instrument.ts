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
const LEGACY_INSTRUMENT_COLLECTION = "piPatches";

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
  private collectionName = INSTRUMENT_COLLECTION;

  static build(data: Partial<IInstrument> = {}): Instrument {
    return new Instrument(merge(merge({}, DEFAULT_INSTRUMENT), data));
  }

  static async find(id: string): Promise<Instrument> {
    for (const collectionName of [
      INSTRUMENT_COLLECTION,
      LEGACY_INSTRUMENT_COLLECTION,
    ]) {
      const docRef = doc(getDb(), collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) continue;

      return new Instrument(
        {
          id: docSnap.id,
          ...docSnap.data(),
        } as IInstrument,
        collectionName,
      );
    }

    throw new Error(`Instrument ${id} not found`);
  }

  static async all(): Promise<Instrument[]> {
    const collections = await Promise.all([
      getDocs(collection(getDb(), INSTRUMENT_COLLECTION)),
      getDocs(collection(getDb(), LEGACY_INSTRUMENT_COLLECTION)),
    ]);
    const instruments = new Map<string, Instrument>();

    for (const querySnapshot of collections) {
      for (const document of querySnapshot.docs) {
        const collectionName =
          document.ref.parent.id === LEGACY_INSTRUMENT_COLLECTION
            ? LEGACY_INSTRUMENT_COLLECTION
            : INSTRUMENT_COLLECTION;

        instruments.set(
          document.id,
          new Instrument(
            { id: document.id, ...document.data() } as IInstrument,
            collectionName,
          ),
        );
      }
    }

    return [...instruments.values()];
  }

  constructor(
    props: Optional<IInstrument, "id">,
    collectionName = INSTRUMENT_COLLECTION,
  ) {
    this.collectionName = collectionName;
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
    this.collectionName = INSTRUMENT_COLLECTION;
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
    return doc(getDb(), this.collectionName, this.id);
  }

  private get props(): Omit<IInstrument, "id"> {
    return {
      name: this.name,
      userId: this.userId,
      document: this.document,
    };
  }
}
