import { setMidiAdapterFactory } from "@blibliki/engine";
import { Capacitor } from "@capacitor/core";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initializeFirebaseOnce } from "./firebase";
import CapacitorMidiAdapter from "./midi/CapacitorMidiAdapter";
import "./styles.css";

// There is no console on a device, so failures go to an element that lives
// outside the React root — it still reports when the app itself is what broke.
const errorsEl = document.getElementById("errors")!;

function reportError(message: string) {
  errorsEl.hidden = false;
  errorsEl.textContent += `${message}\n`;
}

window.addEventListener("error", (e) => {
  reportError(`error: ${e.message}`);
});
window.addEventListener("unhandledrejection", (e) => {
  reportError(`unhandled: ${String(e.reason)}`);
});

// WebKit has no Web MIDI, so on iOS the engine is pointed at CoreMIDI instead.
const capacitorMidi = new CapacitorMidiAdapter();
if (capacitorMidi.isSupported()) {
  setMidiAdapterFactory(() => capacitorMidi);
} else if (!("requestMIDIAccess" in navigator)) {
  reportError(
    `no midi on ${Capacitor.getPlatform()}: neither Web MIDI nor the native plugin is available`,
  );
}

// Instruments are read from Firestore, so this has to happen before anything
// asks for the list.
initializeFirebaseOnce();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
