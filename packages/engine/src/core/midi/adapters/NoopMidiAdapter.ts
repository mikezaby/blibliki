import type { IMidiAccess, IMidiAdapter } from "./types";

// React Native has neither Web MIDI nor node-midi. Real device MIDI on native
// needs a dedicated RN module (BLE/USB) — until then MIDI devices are simply
// unavailable. VirtualMidi (programmatic) still works, since it's a module, not
// a device adapter.
export default class NoopMidiAdapter implements IMidiAdapter {
  isSupported(): boolean {
    return false;
  }

  requestMIDIAccess(): Promise<IMidiAccess | null> {
    return Promise.resolve(null);
  }
}
