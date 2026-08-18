import type { IMidiAccess, IMidiAdapter } from "./types";

// For hosts with neither Web MIDI nor node-midi (e.g. iOS WebKit, which has no
// Web MIDI and needs a native CoreMIDI bridge). Device MIDI is simply
// unavailable; VirtualMidi still works, since it's a module, not a device
// adapter.
export default class NoopMidiAdapter implements IMidiAdapter {
  isSupported(): boolean {
    return false;
  }

  requestMIDIAccess(): Promise<IMidiAccess | null> {
    return Promise.resolve(null);
  }
}
