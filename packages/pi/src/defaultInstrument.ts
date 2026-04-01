import { ModuleType } from "@blibliki/engine";
import {
  createDefaultPlayableInstrumentDocument,
  type InstrumentDisplayState,
  type InstrumentDocument,
  type MidiPortSelection,
} from "@blibliki/instrument";
import {
  createConfiguredDisplayOutput,
  type DisplayOutput,
} from "@/displayOutput";
import {
  createInstrumentSession,
  type InstrumentSessionEngine,
  type InstrumentSession,
  startInstrumentSession,
} from "@/instrumentSession";

export type DefaultInstrumentSessionOptions = {
  key?: string;
  voices?: number;
  droneNote?: string;
  controllerInput?: MidiPortSelection | false;
  controllerOutput?: MidiPortSelection | false;
};

export type DefaultInstrumentSession = InstrumentSession & {
  runtime: InstrumentSession["runtime"] & {
    droneMidiId: string;
    droneTrackKey: string;
    droneNote: string;
  };
};

export type StartDefaultInstrumentDependencies = {
  startInstrumentSession?: typeof startInstrumentSession;
  createConfiguredDisplayOutput?: () => DisplayOutput;
  waitForShutdown?: typeof waitForShutdown;
};

const DEFAULT_VOICES = 8;
const DEFAULT_DRONE_NOTE = "C3";

function createDefaultInstrumentDocumentForSession(
  options: DefaultInstrumentSessionOptions,
): InstrumentDocument {
  const document = createDefaultPlayableInstrumentDocument();
  const firstTrack = document.tracks[0];
  if (!firstTrack) {
    throw new Error(
      "Default instrument document must include at least one track",
    );
  }

  document.tracks[0] = {
    ...firstTrack,
    key: options.key ?? firstTrack.key,
    name: options.key,
    sourceProfileId: "osc",
  };

  return document;
}

function getSelectedMidiName(
  patch: InstrumentSession["patch"],
  moduleId: string | undefined,
): string | undefined {
  if (!moduleId) {
    return;
  }

  const module = patch.modules.find((candidate) => candidate.id === moduleId);
  if (
    !module ||
    (module.moduleType !== ModuleType.MidiInput &&
      module.moduleType !== ModuleType.MidiOutput)
  ) {
    return;
  }

  const props = module.props as { selectedName?: unknown };
  const selectedName = props.selectedName;
  return typeof selectedName === "string" ? selectedName : undefined;
}

function logControllerStatus(
  engine: InstrumentSessionEngine,
  session: DefaultInstrumentSession,
) {
  const controllerInputName = getSelectedMidiName(
    session.patch,
    session.runtime.controllerInputId,
  );
  const controllerOutputName = getSelectedMidiName(
    session.patch,
    session.runtime.controllerOutputId,
  );

  if (controllerInputName) {
    const inputMatch = engine.findMidiInputDeviceByFuzzyName(
      controllerInputName,
      0.6,
    );

    if (inputMatch) {
      console.log(`Controller input: ${inputMatch.device.name}`);
    } else {
      console.log(`Controller input not found: ${controllerInputName}`);
    }
  }

  if (controllerOutputName) {
    const outputMatch = engine.findMidiOutputDeviceByFuzzyName?.(
      controllerOutputName,
      0.6,
    );

    if (outputMatch) {
      console.log(`Controller output: ${outputMatch.device.name}`);
    } else {
      console.log(`Controller output not found: ${controllerOutputName}`);
    }
  }
}

async function waitForShutdown(
  engine: InstrumentSessionEngine,
  session: DefaultInstrumentSession,
  onShutdown?: () => void,
): Promise<void> {
  await new Promise<void>((resolve) => {
    const shutdown = (signal: string) => {
      console.log(`\nStopping default instrument (${signal})...`);

      try {
        engine.triggerVirtualMidi(
          session.runtime.droneMidiId,
          session.runtime.droneNote,
          "noteOff",
        );
      } catch {
        // Ignore shutdown note-off issues; the engine is being disposed anyway.
      }

      onShutdown?.();
      engine.dispose();
      process.off("SIGINT", onSigInt);
      process.off("SIGTERM", onSigTerm);
      resolve();
    };

    const onSigInt = () => {
      shutdown("SIGINT");
    };
    const onSigTerm = () => {
      shutdown("SIGTERM");
    };

    process.on("SIGINT", onSigInt);
    process.on("SIGTERM", onSigTerm);
  });
}

export function createDefaultInstrumentSession(
  options: DefaultInstrumentSessionOptions = {},
): DefaultInstrumentSession {
  const document = createDefaultInstrumentDocumentForSession(options);
  const voices = options.voices ?? DEFAULT_VOICES;
  const droneTrack = document.tracks[0];
  if (!droneTrack) {
    throw new Error("Default instrument session requires at least one track");
  }

  return createInstrumentSession(document, {
    trackVoices: voices,
    noteInput: false,
    controllerInput: options.controllerInput,
    controllerOutput: options.controllerOutput,
    drone: {
      trackKey: droneTrack.key,
      note: options.droneNote ?? DEFAULT_DRONE_NOTE,
    },
  }) as DefaultInstrumentSession;
}

export async function startDefaultInstrument(
  options: DefaultInstrumentSessionOptions = {},
  dependencies: StartDefaultInstrumentDependencies = {},
): Promise<void> {
  console.log("=== Blibliki Pi Default Instrument ===");

  const document = createDefaultInstrumentDocumentForSession(options);
  const voices = options.voices ?? DEFAULT_VOICES;
  const droneTrack = document.tracks[0];
  if (!droneTrack) {
    throw new Error("Default instrument session requires at least one track");
  }
  const displayOutput =
    dependencies.createConfiguredDisplayOutput?.() ??
    createConfiguredDisplayOutput();
  const startedSession = await (
    dependencies.startInstrumentSession ?? startInstrumentSession
  )(document, {
    trackVoices: voices,
    noteInput: false,
    controllerInput: options.controllerInput,
    controllerOutput: options.controllerOutput,
    drone: {
      trackKey: droneTrack.key,
      note: options.droneNote ?? DEFAULT_DRONE_NOTE,
    },
    onDisplayStateChange: (displayState: InstrumentDisplayState) => {
      displayOutput.render(displayState);
    },
  });
  const { engine, controllerSession } = startedSession;
  const session = startedSession.session as DefaultInstrumentSession;
  const droneNote = session.runtime.droneNote;

  console.log(`Started default instrument with drone note ${droneNote}`);
  logControllerStatus(engine, session);
  console.log(
    "Use your Launch Control XL3 to shape the sound. Press Ctrl+C to stop.",
  );

  await (dependencies.waitForShutdown ?? waitForShutdown)(
    engine,
    session,
    () => {
      displayOutput.dispose();
      controllerSession.dispose();
    },
  );
}
