import {
  Engine,
  type MidiEvent,
  MidiEventType,
  type MidiOutput,
} from "@blibliki/engine";
import {
  type IRoute,
  type IVideoModule,
  type MidiNoteEvent,
} from "@blibliki/video-engine";

// The video patch's MIDI routes that start outside it, at an audio module.
export function bridgedMidiRoutes(
  routes: IRoute[],
  modules: IVideoModule[],
): IRoute[] {
  const video = new Set(modules.map((m) => m.id));

  return routes.filter(
    (route) => route.kind === "midi" && !video.has(route.source.moduleId),
  );
}

// A note as the worker takes it. The voice the audio Voice Scheduler chose
// becomes the instance.
export function noteEvent(event: MidiEvent): MidiNoteEvent | null {
  if (!event.isNote) return null;
  const note = event.rawMessage.data[1];
  if (note === undefined) return null;

  return {
    type: event.type === MidiEventType.noteOn ? "noteOn" : "noteOff",
    note,
    velocity: event.note?.velocity ?? 0,
    ...(event.voiceNo === undefined ? {} : { instance: event.voiceNo }),
  };
}

// One listener per bridged MIDI route, on the audio module's MIDI output
// the route starts at; its notes go to the worker for the route's
// destination. Web MIDI is not available in a worker, so the cable is
// bridged here. Listeners live only in the engine and are never persisted.
export class MidiBridge {
  private taps = new Map<string, () => void>();

  constructor(
    private engine: Pick<Engine, "findModule">,
    private forward: (
      moduleId: string,
      ioName: string,
      event: MidiNoteEvent,
    ) => void,
  ) {}

  sync(routes: IRoute[]) {
    const wanted = new Map(routes.map((route) => [route.id, route]));
    for (const [id, stop] of this.taps) {
      if (!wanted.has(id)) this.remove(id, stop);
    }
    for (const route of routes) {
      if (!this.taps.has(route.id)) this.add(route);
    }
  }

  dispose() {
    for (const [id, stop] of this.taps) this.remove(id, stop);
  }

  // A source that is not in the engine yet is left alone; the next sync
  // tries again.
  private add(route: IRoute) {
    let output: MidiOutput | undefined;
    try {
      output = this.engine
        .findModule(route.source.moduleId)
        .outputs.collection.find(
          (io): io is MidiOutput =>
            io.isMidi() && io.name === route.source.ioName,
        );
    } catch {
      return;
    }
    if (!output) return;

    const { moduleId, ioName } = route.destination;
    const stop = output.listen((event) => {
      const note = noteEvent(event);
      if (note) this.forward(moduleId, ioName, note);
    });
    this.taps.set(route.id, stop);
  }

  private remove(id: string, stop: () => void) {
    stop();
    this.taps.delete(id);
  }
}
