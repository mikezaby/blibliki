import {
  Engine,
  ModuleType,
  type IEngineSerialize,
  type IRoute,
} from "@blibliki/engine";
import patchJson from "./patch.json";

// Proof of concept: does the real engine (AudioWorklet processors, wavetable,
// step sequencer) run inside the iOS WKWebView? Everything is reported on
// screen because there is no console on a device — including a peak meter, so
// "it plays" is measured, not assumed.
const patch = patchJson as unknown as IEngineSerialize;

const logEl = document.getElementById("log")!;
const meterEl = document.getElementById("meter")!;
const button = document.getElementById("play") as HTMLButtonElement;

function log(message: string) {
  logEl.textContent += `${message}\n`;
}

window.addEventListener("error", (e) => {
  log(`error: ${e.message}`);
});
window.addEventListener("unhandledrejection", (e) => {
  log(`unhandled: ${String(e.reason)}`);
});

// Tap whatever feeds Master with an Inspector, so we can read the output level.
function addMeter(engine: Engine) {
  const masterId = patch.modules.find(
    (m) => m.moduleType === ModuleType.Master,
  )?.id;
  const toMaster = patch.routes.find(
    (r: IRoute) => r.destination.moduleId === masterId,
  );
  if (!toMaster) return;

  const inspector = engine.addModule({
    name: "meter",
    moduleType: ModuleType.Inspector,
    props: {},
  });
  engine.addRoute({
    source: toMaster.source,
    destination: { moduleId: inspector.id, ioName: "in" },
  });

  const module = engine.modules.get(inspector.id);
  if (module?.moduleType !== ModuleType.Inspector) return;

  let peak = 0;
  const tick = () => {
    for (const sample of module.getValues())
      peak = Math.max(peak, Math.abs(sample));
    meterEl.textContent = `peak ${peak.toFixed(3)}`;
    requestAnimationFrame(tick);
  };
  tick();
}

let engine: Engine | undefined;
let playing = false;

button.addEventListener("click", () => {
  button.disabled = true;

  void (async () => {
    try {
      if (!engine) {
        log("loading patch…");
        engine = await Engine.load(patch);
        log(
          `loaded ${engine.modules.size} modules, sr ${engine.context.audioContext.sampleRate}`,
        );
        addMeter(engine);
      }

      if (playing) {
        engine.stop();
        log("stopped");
      } else {
        await engine.start();
        log(`playing (context ${engine.context.audioContext.state})`);
      }

      playing = !playing;
      button.textContent = playing ? "Stop" : "Play patch";
    } catch (e) {
      log(`failed: ${String(e)}`);
    } finally {
      button.disabled = false;
    }
  })();
});

// ponytail: auto-attempt on load so the PoC can be verified without a tap.
// iOS normally refuses to resume an AudioContext without a user gesture — if it
// does, the log says so and the button is the real path.
button.click();
