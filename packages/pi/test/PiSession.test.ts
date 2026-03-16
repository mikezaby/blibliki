import { ModuleType, TransportState, type Engine } from "@blibliki/engine";
import {
  compileInstrumentDocument,
  createDefaultInstrumentDocument,
} from "@blibliki/instrument";
import assert from "node:assert/strict";
import test from "node:test";
import { PiSession } from "../src/runtime/PiSession.ts";

const SHIFT = 63;
const PAGE_NEXT = 107;
const TRACK_NEXT = 102;
const SEQ_VELOCITY_2 = 22;
const SEQ_PITCH_2 = 30;
const GLOBAL_MASTER_FILTER_CUTOFF = 15;

const createEngineStub = () => {
  const stepSequencerModule = {
    moduleType: ModuleType.StepSequencer,
    props: {},
    state: {},
    triggerPropsUpdate() {},
  };
  const masterFilterModule = {
    moduleType: ModuleType.Filter,
    props: { cutoff: 12000, Q: 1, type: "lowpass", envelopeAmount: 0 },
    state: {},
    triggerPropsUpdate() {},
  };
  const midiMapperModule = {
    moduleType: ModuleType.MidiMapper,
    props: {
      activeTrack: 0,
      tracks: [],
      globalMappings: [],
    },
    syncControllerValues() {},
    triggerPropsUpdate() {},
  };

  const engine = {
    id: "engine-test",
    state: TransportState.stopped,
    bpm: 120,
    transport: { swingAmount: 0 },
    midiDeviceManager: { inputDevices: new Map() },
    onPropsUpdate() {},
    findModule(id: string) {
      if (id === "instrument-midi-mapper") return midiMapperModule;
      if (id === "global-master-filter") return masterFilterModule;
      return stepSequencerModule;
    },
  } as unknown as Engine;

  return { engine, stepSequencerModule, masterFilterModule, midiMapperModule };
};

test("ignores seq-edit encoders beyond the authored track voice count", () => {
  const document = createDefaultInstrumentDocument();
  const compiled = compileInstrumentDocument(document);
  const { engine } = createEngineStub();
  const session = new PiSession(engine, compiled) as PiSession & {
    pushDisplayState: () => void;
  };

  session.pushDisplayState = () => {};
  session.handleControllerEvent(SHIFT, 127);
  session.handleControllerEvent(PAGE_NEXT, 127);

  assert.doesNotThrow(() => {
    session.handleControllerEvent(SEQ_VELOCITY_2, 100);
  });
  assert.doesNotThrow(() => {
    session.handleControllerEvent(SEQ_PITCH_2, 64);
  });

  const notes = document.tracks[0]?.stepSequencer?.pages[0]?.steps[0]?.notes;
  assert.equal(notes?.length, 1);
});

test("does not crash when controller output attaches before note source modules are loaded", () => {
  const document = createDefaultInstrumentDocument();
  const compiled = compileInstrumentDocument(document);
  const output = {
    directSend() {},
  };
  const engine = {
    id: "engine-test",
    state: TransportState.stopped,
    bpm: 120,
    transport: { swingAmount: 0 },
    midiDeviceManager: { inputDevices: new Map() },
    onPropsUpdate() {},
    modules: new Map(),
    findModule(_id: string) {
      throw new Error("The module with id track-1-note-source is not exists");
    },
  } as unknown as Engine;
  const session = new PiSession(engine, compiled);

  assert.doesNotThrow(() => {
    session.attachControllerOutput(output as never);
  });
});

test("syncs the midi mapper active track when performance focus changes", () => {
  const document = createDefaultInstrumentDocument();
  const compiled = compileInstrumentDocument(document);
  const { engine, midiMapperModule } = createEngineStub();
  const session = new PiSession(engine, compiled);

  session.handleControllerEvent(TRACK_NEXT, 127);

  assert.equal(midiMapperModule.props.activeTrack, 1);
});

test("does not apply normal performance encoder bindings directly", () => {
  const document = createDefaultInstrumentDocument();
  const compiled = compileInstrumentDocument(document);
  const { engine, masterFilterModule } = createEngineStub();
  const session = new PiSession(engine, compiled);

  session.handleControllerEvent(GLOBAL_MASTER_FILTER_CUTOFF, 127);

  assert.equal(masterFilterModule.props.cutoff, 12000);
});
