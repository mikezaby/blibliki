/**
 * MIDI adapter factory
 * Automatically selects the correct MIDI implementation based on the platform
 */
import { isNode } from "es-toolkit";
import NodeMidiAdapter from "./NodeMidiAdapter";
import WebMidiAdapter from "./WebMidiAdapter";
import type { IMidiAdapter } from "./types";

export * from "./types";

/**
 * Creates the appropriate MIDI adapter for the current platform
 * @returns The MIDI adapter (Web MIDI API for browsers, node-midi for Node.js)
 */
export function createMidiAdapter(): IMidiAdapter {
  if (isNode()) {
    return new NodeMidiAdapter();
  }

  // Default to Web MIDI API for browsers
  return new WebMidiAdapter();
}
