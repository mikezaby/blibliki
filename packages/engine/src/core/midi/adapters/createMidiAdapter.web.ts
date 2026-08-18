import { isNode } from "es-toolkit";
import NodeMidiAdapter from "./NodeMidiAdapter";
import WebMidiAdapter from "./WebMidiAdapter";
import type { IMidiAdapter } from "./types";

// Web/Node adapter factory. Imported only by the browser entry (and test setup),
// so NodeMidiAdapter (@julusian/midi) never reaches the native bundle.
export function createWebMidiAdapter(): IMidiAdapter {
  if (isNode()) {
    return new NodeMidiAdapter();
  }
  return new WebMidiAdapter();
}
