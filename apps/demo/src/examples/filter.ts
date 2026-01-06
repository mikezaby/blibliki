import { ModuleType, OscillatorWave } from "@blibliki/engine";
import { useEngineStore } from "../store/useEngineStore";

export function load() {
  const { addModule, addRoute } = useEngineStore.getState();

  const midi = addModule({
    name: "Midi",
    moduleType: ModuleType.MidiInput,
    props: { selectedId: "1695389404" },
  });

  const osc = addModule({
    name: "Oscillator",
    moduleType: ModuleType.Oscillator,
    props: { wave: OscillatorWave.sawtooth },
  });

  const gain = addModule({
    name: "Gain",
    moduleType: ModuleType.Gain,
    props: { gain: 0.2 },
  });

  const env = addModule({
    name: "Env",
    moduleType: ModuleType.Envelope,
    props: { attack: 0, decay: 0, sustain: 1, release: 0 },
  });

  const filter = addModule({
    name: "Filter",
    moduleType: ModuleType.Filter,
    props: { cutoff: 22050, envelopeAmount: 1 },
  });

  const constant = addModule({
    name: "Filter Const",
    moduleType: ModuleType.Constant,
    props: { value: 1 },
  });

  const filterEnv = addModule({
    name: "Filter Env",
    moduleType: ModuleType.Envelope,
    props: {},
  });

  const master = addModule({
    name: "Master",
    moduleType: ModuleType.Master,
    props: {},
  });

  addRoute({
    source: { moduleId: osc.id, ioName: "out" },
    destination: { moduleId: gain.id, ioName: "in" },
  });

  addRoute({
    source: { moduleId: gain.id, ioName: "out" },
    destination: { moduleId: env.id, ioName: "in" },
  });

  addRoute({
    source: { moduleId: env.id, ioName: "out" },
    destination: { moduleId: filter.id, ioName: "in" },
  });

  addRoute({
    source: { moduleId: filter.id, ioName: "out" },
    destination: { moduleId: master.id, ioName: "in" },
  });

  addRoute({
    source: { moduleId: constant.id, ioName: "out" },
    destination: { moduleId: filterEnv.id, ioName: "in" },
  });

  addRoute({
    source: { moduleId: filterEnv.id, ioName: "out" },
    destination: { moduleId: filter.id, ioName: "cutoffMod" },
  });

  addRoute({
    source: { moduleId: midi.id, ioName: "midi out" },
    destination: { moduleId: osc.id, ioName: "midi in" },
  });

  addRoute({
    source: { moduleId: midi.id, ioName: "midi out" },
    destination: { moduleId: env.id, ioName: "midi in" },
  });

  addRoute({
    source: { moduleId: midi.id, ioName: "midi out" },
    destination: { moduleId: filterEnv.id, ioName: "midi in" },
  });
}
