// Browser entry point - re-exports everything from index and adds Context from browser version
export * from "./index.js";
export { Context, type AnyAudioContext } from "./Context.browser.js";
