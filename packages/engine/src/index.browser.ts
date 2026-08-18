// Browser/Node entry point - wires the platform implementations, then re-exports
// the full engine API.
import { setMidiAdapterFactory } from "./core/midi/adapters";
import { createWebMidiAdapter } from "./core/midi/adapters/createMidiAdapter.web";

setMidiAdapterFactory(createWebMidiAdapter);

export * from "./index";
