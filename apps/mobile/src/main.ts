import {
  Engine,
  ModuleType,
  type IEngineSerialize,
  type IRoute,
} from "@blibliki/engine";
import midiJson from "./patches/midi.json";
import wavetableJson from "./patches/wavetable.json";

// Proof of concept: does the real engine (AudioWorklet processors, wavetable,
// step sequencer, MIDI input) run inside the iOS WKWebView? Everything is
// reported on screen because there is no console on a device — including a peak
// meter, so "it plays" is measured, not assumed.
const patches: Record<string, IEngineSerialize> = {
  "wavetable + sequencer": wavetableJson as unknown as IEngineSerialize,
  "midi keyboard": midiJson as unknown as IEngineSerialize,
};

const logEl = document.getElementById("log")!;
const meterEl = document.getElementById("meter")!;
const button = document.getElementById("play") as HTMLButtonElement;
const patchSelect = document.getElementById("patch") as HTMLSelectElement;
const midiSelect = document.getElementById("midi") as HTMLSelectElement;

function log(message: string) {
  logEl.textContent += `${message}\n`;
}

window.addEventListener("error", (e) => {
  log(`error: ${e.message}`);
});
window.addEventListener("unhandledrejection", (e) => {
  log(`unhandled: ${String(e.reason)}`);
});

log(
  `web midi api: ${"requestMIDIAccess" in navigator ? "available" : "MISSING — needs a native plugin"}`,
);

let engine: Engine | undefined;
let playing = false;
let meter: { getValues(): Float32Array } | undefined;
let peak = 0;

function pollMeter() {
  if (meter) {
    for (const sample of meter.getValues())
      peak = Math.max(peak, Math.abs(sample));
    meterEl.textContent = `peak ${peak.toFixed(3)}`;
  }
  requestAnimationFrame(pollMeter);
}
pollMeter();

// Tap whatever feeds Master with an Inspector, so we can read the output level.
function addMeter(current: Engine, patch: IEngineSerialize) {
  const masterId = patch.modules.find(
    (m) => m.moduleType === ModuleType.Master,
  )?.id;
  const toMaster = patch.routes.find(
    (r: IRoute) => r.destination.moduleId === masterId,
  );
  if (!toMaster) return;

  const inspector = current.addModule({
    name: "meter",
    moduleType: ModuleType.Inspector,
    props: {},
  });
  current.addRoute({
    source: toMaster.source,
    destination: { moduleId: inspector.id, ioName: "in" },
  });

  const module = current.modules.get(inspector.id);
  if (module?.moduleType !== ModuleType.Inspector) return;
  meter = module;
}

// The device id baked into a patch comes from whatever machine exported it, so
// it never matches on another device — pick the real one here.
function bindMidiSelect(current: Engine, patch: IEngineSerialize) {
  const midiInput = patch.modules.find(
    (m) => m.moduleType === ModuleType.MidiInput,
  );
  midiSelect.hidden = !midiInput;
  if (!midiInput) return;

  const module = current.modules.get(midiInput.id);
  if (module?.moduleType !== ModuleType.MidiInput) return;

  const render = () => {
    const devices = Array.from(current.midiDeviceManager.inputDevices.values());
    const selectedId = module.props.selectedId;

    midiSelect.replaceChildren(
      new Option("— select MIDI input —", ""),
      ...devices.map(
        (d) => new Option(d.name, d.id, false, d.id === selectedId),
      ),
    );
    log(`midi inputs: ${devices.map((d) => d.name).join(", ") || "none"}`);
  };

  midiSelect.onchange = () => {
    current.updateModule({
      id: midiInput.id,
      moduleType: ModuleType.MidiInput,
      changes: { props: { selectedId: midiSelect.value || null } },
    });
    log(`midi in: ${midiSelect.selectedOptions[0]?.text ?? "none"}`);
  };

  render();
  current.midiDeviceManager.addListener(render);
}

async function loadPatch(name: string) {
  const patch = patches[name]!;

  if (engine) {
    engine.stop();
    engine.dispose();
    await engine.context.close();
    meter = undefined;
    playing = false;
  }

  peak = 0;
  log(`loading ${name}…`);
  engine = await Engine.load(patch);
  log(
    `loaded ${engine.modules.size} modules, sr ${engine.context.audioContext.sampleRate}`,
  );
  addMeter(engine, patch);
  bindMidiSelect(engine, patch);

  return engine;
}

async function toggle() {
  const current = engine ?? (await loadPatch(patchSelect.value));

  if (playing) {
    current.stop();
    log("stopped");
  } else {
    await current.start();
    log(`playing (context ${current.context.audioContext.state})`);
  }

  playing = !playing;
  button.textContent = playing ? "Stop" : "Play patch";
}

function run(action: () => Promise<unknown>) {
  button.disabled = true;

  void (async () => {
    try {
      await action();
    } catch (e) {
      log(`failed: ${String(e)}`);
    } finally {
      button.disabled = false;
    }
  })();
}

patchSelect.replaceChildren(
  ...Object.keys(patches).map((n) => new Option(n, n)),
);
patchSelect.onchange = () => {
  run(async () => {
    await loadPatch(patchSelect.value);
    button.textContent = "Play patch";
  });
};
button.addEventListener("click", () => {
  run(toggle);
});

// ponytail: auto-attempt on load so the PoC can be verified without a tap.
// iOS normally refuses to resume an AudioContext without a user gesture — if it
// does, the log says so and the button is the real path.
button.click();
