import type { ICreateModule, ModuleType } from "@blibliki/engine";
import type { AnyBaseSlot } from "@/slots/BaseSlot";

export type BlockPlug = {
  moduleId: string;
  ioName: string;
};

export type BlockRoute = {
  id: string;
  source: BlockPlug;
  destination: BlockPlug;
};

export type CreateBlockRoute = Omit<BlockRoute, "id"> & {
  id?: string;
};

export type BlockIOKind = "audio" | "midi";

export type BlockIO = {
  ioName: string;
  kind: BlockIOKind;
  plugs: BlockPlug[];
};

export type BlockModule<T extends ModuleType = ModuleType> =
  ICreateModule<T> & {
    id: string;
    voices?: number;
  };

export type UpdateBlockModule<T extends ModuleType = ModuleType> = Partial<
  Omit<BlockModule<T>, "id">
>;

export type CreateBlockIO = BlockIO;

export type SerializedBlock = {
  key: string;
  type: string;
  modules: BlockModule[];
  routes: BlockRoute[];
  inputs: BlockIO[];
  outputs: BlockIO[];
  slots: AnyBaseSlot[];
};
