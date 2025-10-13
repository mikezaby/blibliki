import { ModuleType } from "@/modules";
import { PolyModule } from "../module/PolyModule";
import { AudioInput, AudioOutput } from "./AudioIO";
import IO, { IOProps, IOType } from "./Base";

export type PolyAudioIO = PolyAudioInput | PolyAudioOutput;

export type PolyAudioInputProps = IOProps & {
  ioType: IOType.PolyAudioInput;
};

export type PolyAudioOutputProps = IOProps & {
  ioType: IOType.PolyAudioOutput;
};

export class PolyAudioInput
  extends IO<PolyAudioOutput | AudioOutput>
  implements PolyAudioInputProps
{
  declare ioType: IOType.PolyAudioInput;
  declare module: PolyModule<ModuleType>;

  plug(io: PolyAudioOutput | AudioOutput, plugOther = true) {
    super.plug(io, plugOther);
    if (!plugOther && io instanceof PolyAudioOutput) return;

    plugOrUnplug(this, io, true);
  }

  unPlug(io: PolyAudioOutput | AudioOutput, plugOther = true) {
    super.unPlug(io, plugOther);
    if (!plugOther && io instanceof PolyAudioOutput) return;

    plugOrUnplug(this, io, false);
  }

  findIOByVoice(voice: number): AudioInput {
    return this.module
      .findVoice(voice)
      .inputs.findByName(this.name) as AudioInput;
  }
}

export class PolyAudioOutput
  extends IO<PolyAudioInput | AudioInput>
  implements PolyAudioOutputProps
{
  declare ioType: IOType.PolyAudioOutput;
  declare module: PolyModule<ModuleType>;

  plug(io: PolyAudioInput | AudioInput, plugOther = true) {
    super.plug(io, plugOther);
    if (!plugOther && io instanceof PolyAudioInput) return;

    plugOrUnplug(this, io, true);
  }

  unPlug(io: PolyAudioInput | AudioInput, plugOther = true) {
    super.unPlug(io, plugOther);
    if (!plugOther && io instanceof PolyAudioInput) return;

    plugOrUnplug(this, io, false);
  }

  findIOByVoice(voice: number): AudioOutput {
    return this.module
      .findVoice(voice)
      .outputs.findByName(this.name) as AudioOutput;
  }
}

function plugOrUnplug(
  thisIO: PolyAudioInput,
  otherIO: PolyAudioOutput | AudioOutput,
  isPlug: boolean,
): void;
function plugOrUnplug(
  thisIO: PolyAudioOutput,
  otherIO: PolyAudioInput | AudioInput,
  isPlug: boolean,
): void;
function plugOrUnplug(
  thisIO: PolyAudioInput | PolyAudioOutput,
  otherIO: PolyAudioOutput | AudioOutput | PolyAudioInput | AudioInput,
  isPlug: boolean,
) {
  if (otherIO instanceof PolyAudioInput || otherIO instanceof PolyAudioOutput) {
    const maxVoices = Math.max(thisIO.module.voices, otherIO.module.voices);

    for (let voice = 0; voice < maxVoices; voice++) {
      const thisMonoIO = thisIO.findIOByVoice(voice % thisIO.module.voices);
      const otherMonoIO = otherIO.findIOByVoice(voice % otherIO.module.voices);

      if (isPlug) {
        // @ts-expect-error: temp solution until guard this input plug to output
        thisMonoIO.plug(otherMonoIO);
      } else {
        // @ts-expect-error: temp solution until guard this input plug to output
        thisMonoIO.unPlug(otherMonoIO);
      }
    }
  } else {
    for (let voice = 0; voice < thisIO.module.voices; voice++) {
      const thisMonoIO = thisIO.findIOByVoice(voice);

      if (isPlug) {
        // @ts-expect-error: temp solution until guard this input plug to output
        thisMonoIO.plug(otherIO);
      } else {
        // @ts-expect-error: temp solution until guard this input plug to output
        thisMonoIO.unPlug(otherIO);
      }
    }
  }
}
