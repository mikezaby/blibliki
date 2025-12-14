// Node.js entry point - re-exports everything from index and adds Context from node version
export * from "./index.js";
export { Context, type AnyAudioContext } from "./Context.node.js";
export {
  requestAnimationFrame,
  cancelAnimationFrame,
} from "./requestAnimationFrame.node.js";
