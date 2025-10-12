import { ModuleType } from "@/modules";
import { Module } from "../module";
import IO, { IOProps, IOType } from "./Base";
import { PolyAudioInput, PolyAudioOutput } from "./PolyAudioIO";

export type AudioIO = AudioInput | AudioOutput;

export type AudioInputProps = IOProps & {
  ioType: IOType.AudioInput;
  getAudioNode: () => AudioNode | AudioParam | AudioDestinationNode;
};

export type AudioOutputProps = IOProps & {
  ioType: IOType.AudioOutput;
  getAudioNode: () => AudioNode;
};

export class AudioInput
  extends IO<AudioOutput | PolyAudioOutput>
  implements AudioInputProps
{
  declare ioType: IOType.AudioInput;
  getAudioNode: AudioInputProps["getAudioNode"];

  constructor(module: Module<ModuleType>, props: AudioInputProps) {
    super(module, props);
    this.getAudioNode = props.getAudioNode;
  }
}

export class AudioOutput
  extends IO<AudioInput | PolyAudioInput>
  implements AudioOutputProps
{
  declare ioType: IOType.AudioOutput;
  getAudioNode!: AudioOutputProps["getAudioNode"];

  constructor(module: Module<ModuleType>, props: AudioOutputProps) {
    super(module, props);
    this.getAudioNode = props.getAudioNode;
  }

  plug(io: AudioInput | PolyAudioInput, plugOther = true) {
    super.plug(io, plugOther);
    if (io instanceof PolyAudioInput) return;

    const input = io.getAudioNode();

    if (input instanceof AudioParam) {
      this.getAudioNode().connect(input);
    } else {
      this.getAudioNode().connect(input);
    }
  }

  unPlug(io: AudioInput | PolyAudioInput, plugOther = true) {
    super.unPlug(io, plugOther);
    if (io instanceof PolyAudioInput) return;

    const input = io.getAudioNode();

    try {
      if (input instanceof AudioParam) {
        this.getAudioNode().disconnect(input);
      } else {
        this.getAudioNode().disconnect(input);
      }
    } catch {
      // Ignore disconnect errors
    }
  }
}
