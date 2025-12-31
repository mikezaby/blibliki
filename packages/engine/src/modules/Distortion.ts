import { Context } from "@blibliki/utils";
import { GainNode } from "@blibliki/utils/web-audio-api";
import { ModulePropSchema } from "@/core";
import { IModuleConstructor, Module, SetterHooks } from "@/core/module/Module";
import { IPolyModuleConstructor, PolyModule } from "@/core/module/PolyModule";
import { WetDryMixer } from "@/utils";
import { ICreateModule, ModuleType } from ".";

export type IDistortionProps = {
  drive: number; // 0-10 (controls distortion amount)
  tone: number; // 200-20000 Hz (lowpass filter cutoff)
  mix: number; // 0-1 (dry/wet blend)
};

export type IDistortion = Module<ModuleType.Distortion>;

export const distortionPropSchema: ModulePropSchema<IDistortionProps> = {
  drive: {
    kind: "number",
    min: 0,
    max: 10,
    step: 0.1,
    label: "Drive",
  },
  tone: {
    kind: "number",
    min: 200,
    max: 20000,
    step: 1,
    exp: 3,
    label: "Tone",
  },
  mix: {
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Mix",
  },
};

const DEFAULT_PROPS: IDistortionProps = {
  drive: 2.0, // Moderate distortion
  tone: 8000, // Mid-bright tone
  mix: 1.0, // 100% wet (full effect)
};

export class MonoDistortion
  extends Module<ModuleType.Distortion>
  implements
    Pick<
      SetterHooks<IDistortionProps>,
      "onAfterSetDrive" | "onAfterSetTone" | "onAfterSetMix"
    >
{
  declare audioNode: GainNode; // Input node (inherited from Module)
  private outputNode: GainNode; // Final output from mixer
  private inputGain: GainNode; // Drive stage (pre-distortion gain)
  private waveshaper: WaveShaperNode; // Tanh distortion
  private filter: BiquadFilterNode; // Post-distortion lowpass filter
  private wetDryMixer: WetDryMixer; // Wet/dry blending

  constructor(engineId: string, params: ICreateModule<ModuleType.Distortion>) {
    const props = { ...DEFAULT_PROPS, ...params.props };

    const audioNodeConstructor = (context: Context) =>
      new GainNode(context.audioContext, { gain: 1 });

    super(engineId, {
      ...params,
      audioNodeConstructor,
      props,
    });

    // Create audio nodes
    const audioContext = this.context.audioContext;

    this.inputGain = audioContext.createGain();
    this.waveshaper = audioContext.createWaveShaper();
    this.filter = audioContext.createBiquadFilter();
    this.wetDryMixer = new WetDryMixer(this.context);

    // Configure filter
    this.filter.type = "lowpass";
    this.filter.Q.value = 0.707; // Butterworth response (no resonance peak)

    // Connect audio graph
    // Dry path: Input -> WetDryMixer
    this.wetDryMixer.connectInput(this.audioNode);

    // Wet path: Input -> InputGain -> WaveShaper -> Filter -> WetDryMixer
    this.audioNode.connect(this.inputGain);
    this.inputGain.connect(this.waveshaper);
    this.waveshaper.connect(this.filter);
    this.filter.connect(this.wetDryMixer.getWetInput());

    // Output from mixer
    this.outputNode = this.wetDryMixer.getOutput();

    // Apply initial parameters
    this.updateInputGain(props.drive);
    this.updateDistortionCurve(props.drive);
    this.filter.frequency.value = props.tone;
    this.wetDryMixer.setMix(props.mix);

    // Register IOs
    this.registerDefaultIOs("in");
    this.registerCustomOutput();
  }

  private registerCustomOutput() {
    this.registerAudioOutput({
      name: "out",
      getAudioNode: () => this.outputNode,
    });
  }

  private generateDistortionCurve(drive: number): Float32Array | null {
    const samples = 65536; // High resolution for smooth distortion
    const buffer = new ArrayBuffer(samples * Float32Array.BYTES_PER_ELEMENT);
    const curve: Float32Array = new Float32Array(buffer) as Float32Array;

    for (let i = 0; i < samples; i++) {
      // Map sample index to input range [-1, 1]
      const x = (i * 2) / samples - 1;

      // Apply tanh waveshaping with drive scaling
      // Higher drive values push more of the signal into saturation
      const driven = x * drive;
      curve[i] = Math.tanh(driven);
    }

    return curve;
  }

  private updateDistortionCurve(drive: number): void {
    // @ts-expect-error - TypeScript strict mode issue with Float32Array<ArrayBufferLike> vs Float32Array<ArrayBuffer>
    this.waveshaper.curve = this.generateDistortionCurve(drive);
  }

  private updateInputGain(drive: number): void {
    // Exponential scaling: each increment doubles the gain
    // drive=0 -> 1x, drive=1 -> 2x, drive=2 -> 4x, ..., drive=10 -> 1024x
    this.inputGain.gain.value = Math.pow(2, drive);
  }

  onAfterSetDrive: SetterHooks<IDistortionProps>["onAfterSetDrive"] = (
    value,
  ) => {
    this.updateInputGain(value);
    this.updateDistortionCurve(value);
  };

  onAfterSetTone: SetterHooks<IDistortionProps>["onAfterSetTone"] = (value) => {
    this.filter.frequency.value = value;
  };

  onAfterSetMix: SetterHooks<IDistortionProps>["onAfterSetMix"] = (value) => {
    this.wetDryMixer.setMix(value);
  };
}

export default class PolyDistortion extends PolyModule<ModuleType.Distortion> {
  constructor(
    engineId: string,
    params: IPolyModuleConstructor<ModuleType.Distortion>,
  ) {
    const props = { ...DEFAULT_PROPS, ...params.props };
    const monoModuleConstructor = (
      engineId: string,
      params: IModuleConstructor<ModuleType.Distortion>,
    ) => new MonoDistortion(engineId, params);

    super(engineId, {
      ...params,
      props,
      monoModuleConstructor,
    });

    this.registerDefaultIOs();
  }
}
