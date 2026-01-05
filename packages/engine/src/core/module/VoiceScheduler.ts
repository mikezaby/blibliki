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
  activeNote: string | null = null;
  triggeredAt: ContextTime = 0;
  // Track all current and future occupation ranges
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
  isOccupiedAt(time: ContextTime): boolean {
    return this.occupationRanges.some(
      (range) => time >= range.startTime && time < range.endTime,
    );
  }

  /**
   * Get the earliest end time of all occupation ranges at or after the given time
   * Returns Infinity if the voice has infinite occupation
   */
  getEarliestEndTimeAfter(time: ContextTime): ContextTime {
    const relevantRanges = this.occupationRanges.filter(
      (range) => range.endTime > time,
    );

    if (relevantRanges.length === 0) return -Infinity;

    return Math.min(...relevantRanges.map((range) => range.endTime));
  }

  /**
   * Clean up past occupation ranges that are no longer needed
   */
  private cleanupPastRanges(currentTime: ContextTime) {
    this.occupationRanges = this.occupationRanges.filter(
      (range) => range.endTime > currentTime || range.endTime === Infinity,
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

    // Determine if this is a future event (more than 10ms ahead)
    const currentTime = this.context.audioContext.currentTime;
    const isFutureEvent = triggeredAt - currentTime > 0.01;

    switch (type) {
      case MidiEventType.noteOn: {
        this.activeNote = noteName;
        this.triggeredAt = triggeredAt;

        // Only add occupation ranges for future events
        // Real-time events use activeNote field only
        if (isFutureEvent) {
          this.occupationRanges.push({
            noteName,
            startTime: triggeredAt,
            endTime: Infinity,
          });
        }

        break;
      }
      case MidiEventType.noteOff: {
        this.activeNote = null;

        // Always try to close any open occupation range for this note
        // This handles both scheduled future events and cleanup when stopping
        const range = this.occupationRanges.find(
          (r) => r.noteName === noteName && r.endTime === Infinity,
        );
        if (range) {
          range.endTime = triggeredAt;
        }
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
        voice = this.findFreeVoice(midiEvent.triggeredAt);

        break;
      case MidiEventType.noteOff:
        voice = this.audioModules.find(
          (v) => v.activeNote === midiEvent.note!.fullName,
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

  private findFreeVoice(targetTime: ContextTime): Voice {
    const currentTime = this.context.audioContext.currentTime;
    // Consider it real-time if within 10ms of current time
    const isRealTime = Math.abs(targetTime - currentTime) < 0.01;

    let voice: Voice | undefined;

    if (isRealTime) {
      // For real-time events, use simple activeNote check (original behavior)
      // This avoids issues with residual occupation ranges
      voice = this.audioModules.find((v) => !v.activeNote);
    } else {
      // For future events, use occupation range system
      voice = this.audioModules.find((v) => !v.isOccupiedAt(targetTime));
    }

    // If no available voice, steal one based on the strategy:
    // Primary: voice with earliest end time at or after target time
    // Secondary: among voices with similar end times, choose oldest (earliest triggeredAt)
    if (!voice) {
      if (isRealTime) {
        // For real-time, use original voice stealing strategy
        const sorted = this.audioModules.sort((a, b) => {
          return a.triggeredAt - b.triggeredAt;
        });
        voice = sorted[0];
      } else {
        // For future events, use occupation-aware strategy
        const sorted = this.audioModules.sort((a, b) => {
          const aEndTime = a.getEarliestEndTimeAfter(targetTime);
          const bEndTime = b.getEarliestEndTimeAfter(targetTime);

          // Primary sort by end time
          if (aEndTime !== bEndTime) {
            return aEndTime - bEndTime;
          }

          // Secondary sort by triggered time (oldest first)
          return a.triggeredAt - b.triggeredAt;
        });
        voice = sorted[0];
      }

      if (!voice) {
        throw new Error("No voices available in voice scheduler");
      }

      // Important: Send a noteOff event for the stolen voice's current note
      // This ensures the envelope releases properly before the new note starts
      if (voice.activeNote) {
        const stolenNoteName = voice.activeNote;
        // Always release the stolen note at the current time for immediate audio release
        const releaseTime = this.context.audioContext.currentTime;
        const noteOffEvent = MidiEvent.fromNote(
          stolenNoteName,
          false, // noteOn = false means noteOff
          releaseTime,
        );
        noteOffEvent.voiceNo = voice.voiceNo;

        // Trigger the note off on this voice before reusing it
        voice.midiTriggered(noteOffEvent);
        this.midiOutput.onMidiEvent(noteOffEvent);
      }
    }

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
