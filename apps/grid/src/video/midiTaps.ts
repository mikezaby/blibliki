import {
  Engine,
  type MidiEvent,
  MidiEventType,
  type MidiOutput,
} from "@blibliki/engine";
import {
  type IVideoModule,
  type MidiNoteEvent,
  VideoModuleType,
} from "@blibliki/video-engine";

type TapEngine = Pick<Engine, "findModule">;

export function referencedMidiModules(modules: IVideoModule[]): Set<string> {
  const ids = new Set<string>();
  for (const module of modules) {
    if (module.moduleType !== VideoModuleType.MidiVoices) continue;
    const { moduleId } = module.props as { moduleId: string };
    if (moduleId) ids.add(moduleId);
  }

  return ids;
}

export function noteEvent(event: MidiEvent): MidiNoteEvent | null {
  if (!event.isNote) return null;
  const note = event.rawMessage.data[1];
  if (note === undefined) return null;

  return {
    type: event.type === MidiEventType.noteOn ? "noteOn" : "noteOff",
    note,
    velocity: event.note?.velocity ?? 0,
  };
}

// One listener per audio module a MIDI Voices names, on its first MIDI
// output, shared by every MIDI Voices on that module. Listeners live only
// in the engine and are never persisted.
export class MidiTaps {
  private taps = new Map<string, () => void>();

  constructor(
    private engine: TapEngine,
    private forward: (moduleId: string, event: MidiNoteEvent) => void,
  ) {}

  sync(referenced: Set<string>) {
    for (const [id, stop] of this.taps) {
      if (!referenced.has(id)) this.remove(id, stop);
    }
    for (const id of referenced) {
      if (!this.taps.has(id)) this.add(id);
    }
  }

  dispose() {
    for (const [id, stop] of this.taps) this.remove(id, stop);
  }

  private add(id: string) {
    let output: MidiOutput | undefined;
    try {
      output = this.engine
        .findModule(id)
        .outputs.collection.find((io): io is MidiOutput => io.isMidi());
    } catch {
      return;
    }
    if (!output) return;

    const stop = output.listen((event) => {
      const note = noteEvent(event);
      if (note) this.forward(id, note);
    });
    this.taps.set(id, stop);
  }

  private remove(id: string, stop: () => void) {
    stop();
    this.taps.delete(id);
  }
}
