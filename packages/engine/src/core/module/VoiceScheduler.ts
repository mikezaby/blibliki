import { ContextTime } from "@blibliki/transport";
import { EmptyObject } from "@blibliki/utils";
import { ICreateModule, ModuleType } from "@/modules";
import { MidiOutput } from "../IO";
import MidiEvent, { MidiEventType } from "../midi/MidiEvent";
import { ModulePropSchema } from "../schema";
import { IModuleConstructor, Module } from "./Module";
import { IPolyModuleConstructor, PolyModule } from "./PolyModule";

export type IVoiceSchedulerProps = EmptyObject;
export const voiceSchedulerPropSchema: ModulePropSchema<IVoiceSchedulerProps> =
  {};
const DEFAULT_PROPS = {};

interface OccupationRange {
  noteName: string;
  startTime: ContextTime;
  endTime: ContextTime; // Can be Infinity if noteOff hasn't been triggered yet
}

class Voice extends Module<ModuleType.VoiceScheduler> {
  declare audioNode: undefined;
  private occupationRanges: OccupationRange[] = [];

  constructor(
    engineId: string,
    params: ICreateModule<ModuleType.VoiceScheduler>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    super(engineId, {
      ...params,
      props,
    });
  }

  /**
   * Check if this voice is occupied at a given time
   */
  isOccupiedAt(time: ContextTime, noteName?: string): boolean {
    return this.occupationRanges.some(
      (range) =>
        time >= range.startTime &&
        time < range.endTime &&
        (!noteName || noteName === range.noteName),
    );
  }

  findRange(time: ContextTime, noteName?: string) {
    return this.occupationRanges.find(
      (range) =>
        time >= range.startTime &&
        time < range.endTime &&
        (!noteName || noteName === range.noteName),
    );
  }

  /**
   * Clean up past occupation ranges that are no longer needed
   */
  private cleanupPastRanges(currentTime: ContextTime) {
    const time = currentTime + 0.2; // Cleanup with some time ahead
    this.occupationRanges = this.occupationRanges.filter(
      (range) => range.endTime > time,
    );
  }

  /**
   * Clear all occupation ranges
   * Useful when resetting or stopping playback
   */
  clearOccupationRanges() {
    this.occupationRanges = [];
  }

  midiTriggered = (midiEvent: MidiEvent) => {
    const { triggeredAt, note, type } = midiEvent;

    if (!note) return;
    const noteName = note.fullName;

    this.cleanupPastRanges(triggeredAt);

    switch (type) {
      case MidiEventType.noteOn: {
        const activeRange = this.findRange(triggeredAt, noteName);
        if (activeRange) {
          // Retrigger: close current range so we don't leave overlapping Infinity ranges.
          activeRange.endTime = triggeredAt;
        }
        this.occupationRanges.push({
          noteName,
          startTime: triggeredAt,
          endTime: Infinity,
        });

        break;
      }
      case MidiEventType.noteOff: {
        const range = this.findRange(triggeredAt, noteName);
        if (range) range.endTime = triggeredAt;
        break;
      }
      default:
        throw Error("This type is not a note");
    }
  };
}

export default class VoiceScheduler extends PolyModule<ModuleType.VoiceScheduler> {
  declare audioModules: Voice[];
  midiOutput!: MidiOutput;

  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.VoiceScheduler>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.VoiceScheduler>,
    ) => new Voice(engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this.registerInputs();
    this.registerOutputs();
  }

  onMidiEvent = (midiEvent: MidiEvent) => {
    let voice: Voice | undefined;

    switch (midiEvent.type) {
      case MidiEventType.noteOn:
        voice = this.findFreeVoice(
          midiEvent.triggeredAt,
          midiEvent.note!.fullName,
        );

        break;
      case MidiEventType.noteOff:
        voice = this.audioModules.find((voice) =>
          voice.isOccupiedAt(midiEvent.triggeredAt, midiEvent.note?.fullName),
        );
        break;
      case MidiEventType.cc:
        this.midiOutput.onMidiEvent(midiEvent);
        return;
      default:
        throw Error("This type is not a note");
    }

    if (!voice) return;

    voice.midiTriggered(midiEvent);
    midiEvent.voiceNo = voice.voiceNo;
    this.midiOutput.onMidiEvent(midiEvent);
  };

  private findFreeVoice(targetTime: ContextTime, noteName: string): Voice {
    let voice: Voice | undefined;

    voice =
      this.audioModules.find((v) => v.isOccupiedAt(targetTime, noteName)) ??
      this.audioModules.find((v) => !v.isOccupiedAt(targetTime));

    if (voice) return voice;

    const possibleVoices = this.audioModules
      .map((voice) => {
        const range = voice.findRange(targetTime);
        return range ? ([voice, range] as const) : undefined;
      })
      .filter((voice) => voice !== undefined)
      .sort((a, b) => {
        const [_a, aRange] = a;
        const [_b, bRange] = b;

        return aRange.startTime > bRange.startTime ? 1 : -1;
      });

    voice = possibleVoices[0] ? possibleVoices[0][0] : undefined;
    if (!voice) {
      throw new Error("No voices available in voice scheduler");
    }

    const activeRange = voice.findRange(targetTime);
    if (!activeRange) {
      throw new Error(`No range available in voice at ${targetTime}`);
    }

    const stolenNoteName = activeRange.noteName;
    // Always release the stolen note at the current time for immediate audio release
    const releaseTime = targetTime;
    const noteOffEvent = MidiEvent.fromNote(
      stolenNoteName,
      false, // noteOn = false means noteOff
      releaseTime,
    );
    noteOffEvent.voiceNo = voice.voiceNo;

    // Trigger the note off on this voice before reusing it
    voice.midiTriggered(noteOffEvent);
    this.midiOutput.onMidiEvent(noteOffEvent);

    return voice;
  }

  /**
   * Clear all occupation ranges for all voices
   * Call this when stopping playback or resetting the scheduler
   */
  clearAllOccupationRanges() {
    this.audioModules.forEach((voice) => {
      voice.clearOccupationRanges();
    });
  }

  private registerInputs() {
    this.registerMidiInput({
      name: "midi in",
      onMidiEvent: this.onMidiEvent,
    });
  }

  private registerOutputs() {
    this.midiOutput = this.registerMidiOutput({ name: "midi out" });
  }
}
