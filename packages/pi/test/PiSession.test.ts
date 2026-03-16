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
const SEQ_VELOCITY_2 = 22;
const SEQ_PITCH_2 = 30;

const createEngineStub = () => {
  const stepSequencerModule = {
    moduleType: ModuleType.StepSequencer,
    props: {},
    state: {},
    triggerPropsUpdate() {},
  };

  const engine = {
    id: "engine-test",
    state: TransportState.stopped,
    bpm: 120,
    transport: { swingAmount: 0 },
    midiDeviceManager: { inputDevices: new Map() },
    onPropsUpdate() {},
    findModule() {
      return stepSequencerModule;
    },
  } as unknown as Engine;

  return { engine, stepSequencerModule };
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
