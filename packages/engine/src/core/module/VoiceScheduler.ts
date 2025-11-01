import { ContextTime } from "@blibliki/transport";
import { EmptyObject } from "@blibliki/utils";
import { ICreateModule, ModuleType } from "@/modules";
import { MidiOutput } from "../IO";
import MidiEvent, { MidiEventType } from "../midi/MidiEvent";
import { PropSchema } from "../schema";
import { IModuleConstructor, Module } from "./Module";
import { IPolyModuleConstructor, PolyModule } from "./PolyModule";

export type IVoiceSchedulerProps = EmptyObject;
export const voiceSchedulerPropSchema: PropSchema<IVoiceSchedulerProps> = {};
const DEFAULT_PROPS = {};

class Voice extends Module<ModuleType.VoiceScheduler> {
  declare audioNode: undefined;
  activeNote: string | null = null;
  triggeredAt: ContextTime = 0;

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

  midiTriggered = (midiEvent: MidiEvent) => {
    const { triggeredAt, note, type } = midiEvent;

    if (!note) return;
    const noteName = note.fullName;

    switch (type) {
      case MidiEventType.noteOn:
        this.activeNote = noteName;
        this.triggeredAt = triggeredAt;

        break;
      case MidiEventType.noteOff:
        this.activeNote = null;
        break;
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
        voice = this.findFreeVoice();

        break;
      case MidiEventType.noteOff:
        voice = this.audioModules.find(
          (v) => v.activeNote === midiEvent.note!.fullName,
        );
        break;
      default:
        throw Error("This type is not a note");
    }

    if (!voice) return;

    voice.midiTriggered(midiEvent);
    midiEvent.voiceNo = voice.voiceNo;
    this.midiOutput.onMidiEvent(midiEvent);
  };

  private findFreeVoice(): Voice {
    let voice = this.audioModules.find((v) => !v.activeNote);

    // If no available voice, get the one with the lowest triggeredAt
    voice ??= this.audioModules.sort((a, b) => {
      return a.triggeredAt - b.triggeredAt;
    })[0];

    return voice;
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
