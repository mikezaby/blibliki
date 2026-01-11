import { ModuleType } from "@/modules";
import { IModuleSerialize } from "./Module";
import { IPolyModuleSerialize } from "./PolyModule";

export { Module } from "./Module";
export type { IModule, IModuleSerialize, SetterHooks } from "./Module";
export type { IPolyModule, IPolyModuleSerialize } from "./PolyModule";

export type IAnyModuleSerialize<MT extends ModuleType = ModuleType> =
  | IModuleSerialize<MT>
  | IPolyModuleSerialize<MT>;
