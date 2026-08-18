/**
 * MIDI adapter selection.
 *
 * The concrete adapter is platform-specific: web/node pulls in NodeMidiAdapter
 * (@julusian/midi, a Node native module) which cannot be bundled for React
 * Native. So the factory is injected by the package entry (index.browser /
 * index.native) via setMidiAdapterFactory, keeping the native bundle free of
 * @julusian/midi — the same seam the processors loader uses.
 */
import type { IMidiAdapter } from "./types";

export * from "./types";

type MidiAdapterFactory = () => IMidiAdapter;

let factory: MidiAdapterFactory | null = null;

export function setMidiAdapterFactory(fn: MidiAdapterFactory): void {
  factory = fn;
}

export function createMidiAdapter(): IMidiAdapter {
  if (!factory) {
    throw new Error(
      "MIDI adapter factory not set — import @blibliki/engine via its package " +
        "entry (not an internal module) so the platform adapter is wired.",
    );
  }
  return factory();
}
