import { Module } from "@/core";
import { ModuleType } from ".";

// `AnalyserNode` (the type) is the ambient DOM global; only the value lives in
// "@blibliki/utils/web-audio-api". The base never constructs one, so no import.

/**
 * Shared base for visualization modules (Oscilloscope, VuMeter, Spectrum).
 *
 * Wraps an AnalyserNode tap and exposes time- and frequency-domain readers.
 * Buffers are sized from the node itself, so they track fftSize changes
 * automatically without the base needing to know about props.
 */
export default abstract class AnalyserModule<
  T extends ModuleType,
> extends Module<T> {
  private _timeBuffer?: Float32Array<ArrayBuffer>;
  private _freqBuffer?: Float32Array<ArrayBuffer>;

  // Subclasses build an AnalyserNode; narrow the base AudioNode type here.
  private get analyser(): AnalyserNode {
    return this.audioNode as AnalyserNode;
  }

  private get timeBuffer(): Float32Array<ArrayBuffer> {
    if (this._timeBuffer?.length !== this.analyser.fftSize) {
      this._timeBuffer = new Float32Array(this.analyser.fftSize);
    }

    return this._timeBuffer;
  }

  private get freqBuffer(): Float32Array<ArrayBuffer> {
    if (this._freqBuffer?.length !== this.analyser.frequencyBinCount) {
      this._freqBuffer = new Float32Array(this.analyser.frequencyBinCount);
    }

    return this._freqBuffer;
  }

  /** Time-domain samples in [-1, 1]. */
  getValues(): Float32Array {
    this.analyser.getFloatTimeDomainData(this.timeBuffer);

    return this.timeBuffer;
  }

  /** Frequency-domain magnitudes in dB, one per frequency bin. */
  getFrequencies(): Float32Array {
    this.analyser.getFloatFrequencyData(this.freqBuffer);

    return this.freqBuffer;
  }
}
