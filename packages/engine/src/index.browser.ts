// Browser/Node entry point - wires the platform implementations, then re-exports
// the full engine API.
import { setMidiAdapterFactory } from "./core/midi/adapters";
import { createWebMidiAdapter } from "./core/midi/adapters/createMidiAdapter.web";
import { setProcessorsLoader } from "./processors";
import { loadWebProcessors } from "./processors/loadProcessors.web";

setProcessorsLoader(loadWebProcessors);
setMidiAdapterFactory(createWebMidiAdapter);

export * from "./index";
