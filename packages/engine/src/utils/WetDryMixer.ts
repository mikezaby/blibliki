import { Context } from "@blibliki/utils";

/**
 * WetDryMixer - Reusable wet/dry signal mixer for audio effects
 *
 * Provides equal-power crossfading between dry (unprocessed) and wet (processed) signals.
 * Used by effects modules to blend the original signal with the effect output.
 *
 * Audio Graph:
 * ```
 *                    INPUT
 *                      |
 *         +------------+------------+
 *         |                         |
 *    [DryGainNode]             [WetGainNode]
 *    (cos(mix*π/2))            (sin(mix*π/2))
 *         |                         |
 *         +------------+------------+
 *                      |
 *                 [OutputNode]
 * ```
 *
 * Usage:
 * ```typescript
 * const mixer = new WetDryMixer(context);
 *
 * // Connect input to mixer
 * mixer.connectInput(sourceNode);
 *
 * // Get wet input node and connect effect chain
 * const wetInput = mixer.getWetInput();
 * sourceNode.connect(effectNode);
 * effectNode.connect(wetInput);
 *
 * // Set mix amount
 * mixer.setMix(0.5); // 50/50 blend
 *
 * // Connect output
 * const output = mixer.getOutput();
 * output.connect(destination);
 * ```
 */
export class WetDryMixer {
  private dryGainNode: GainNode;
  private wetGainNode: GainNode;
  private outputNode: GainNode;

  constructor(context: Context) {
    const audioContext = context.audioContext;

    // Create nodes
    this.dryGainNode = audioContext.createGain();
    this.wetGainNode = audioContext.createGain();
    this.outputNode = audioContext.createGain();

    // Initialize gains
    this.dryGainNode.gain.value = 1; // Full dry initially
    this.wetGainNode.gain.value = 0; // No wet initially
    this.outputNode.gain.value = 1; // Unity output

    // Connect to output
    this.dryGainNode.connect(this.outputNode);
    this.wetGainNode.connect(this.outputNode);
  }

  /**
   * Connect an audio source to the dry path.
   * The source should also be connected separately to the wet path processing.
   */
  connectInput(source: AudioNode): void {
    source.connect(this.dryGainNode);
  }

  /**
   * Get the wet input node to connect your effect chain to.
   * Connect your effect output to this node.
   */
  getWetInput(): GainNode {
    return this.wetGainNode;
  }

  /**
   * Get the dry input node (for special routing needs).
   */
  getDryInput(): GainNode {
    return this.dryGainNode;
  }

  /**
   * Get the output node to connect to destination.
   */
  getOutput(): GainNode {
    return this.outputNode;
  }

  /**
   * Set the mix amount between dry and wet signals.
   * Uses equal-power crossfade to maintain constant perceived loudness.
   *
   * @param mix - Mix amount (0-1)
   *   - 0 = 100% dry (no effect)
   *   - 0.5 = 50/50 blend
   *   - 1 = 100% wet (full effect)
   */
  setMix(mix: number): void {
    // Equal-power crossfade
    // This maintains constant perceived loudness across all mix values
    const dryGain = Math.cos((mix * Math.PI) / 2);
    const wetGain = Math.sin((mix * Math.PI) / 2);

    this.dryGainNode.gain.value = dryGain;
    this.wetGainNode.gain.value = wetGain;
  }

  /**
   * Disconnect all nodes (cleanup).
   */
  disconnect(): void {
    this.dryGainNode.disconnect();
    this.wetGainNode.disconnect();
    this.outputNode.disconnect();
  }
}
