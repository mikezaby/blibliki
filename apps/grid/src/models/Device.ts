import { pick } from "@blibliki/utils";
import {
  collection,
  addDoc,
  getDoc,
  doc,
  updateDoc,
  getDocs,
  deleteDoc,
  query,
  where,
} from "firebase/firestore";
import { Optional } from "@/types";
import { db, getDb } from "./db";

export type IDevice = {
  id: string;
  token: string;
  name: string;
  patchId: string | null;
  userId: string;
};

export default class Device implements IDevice {
  id!: string;
  token!: string;
  name!: string;
  patchId!: string | null;
  userId!: string;

  static async find(id: string): Promise<Device> {
    const docRef = doc(db, "devices", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = { id: docSnap.id, ...docSnap.data() } as IDevice;
      return new Device(data);
    } else {
      throw Error(`Device ${id} not found`);
    }
  }

  static async findByUserId(userId: string): Promise<Device[]> {
    const q = query(collection(db, "devices"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      return new Device({
        id: doc.id,
        ...doc.data(),
      } as IDevice);
    });
  }

  static async all(): Promise<Device[]> {
    const querySnapshot = await getDocs(collection(db, "devices"));

    return querySnapshot.docs.map((doc) => {
      return new Device({
        id: doc.id,
        ...doc.data(),
      } as IDevice);
    });
  }

  constructor(props: Optional<IDevice, "id">) {
    Object.assign(
      this,
      pick(props, ["id", "token", "name", "patchId", "userId"]),
    );
  }

  async save(): Promise<void> {
    const db = getDb();

    if (this.id) {
      await updateDoc(this.docRef, this.props);
    } else {
      const docRef = await addDoc(collection(db, "devices"), this.props);
      this.id = docRef.id;
    }
  }

  async delete(): Promise<void> {
    if (!this.id) throw Error("Cannot delete a device without id");

    await deleteDoc(this.docRef);
  }

  serialize(): IDevice {
    return {
      id: this.id,
      ...this.props,
    };
  }

  private get docRef() {
    return doc(db, "devices", this.id);
  }

  private get props(): Omit<IDevice, "id"> {
    return {
      token: this.token,
      name: this.name,
      patchId: this.patchId,
      userId: this.userId,
    };
  }
}
