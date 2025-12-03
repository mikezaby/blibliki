/**
 * Web Audio API Shim
 *
 * Provides seamless usage of Web Audio API between browser and Node.js environments.
 * - In browser: Uses native Web Audio API
 * - In Node.js: Uses node-web-audio-api package
 */
import { isBrowser } from "es-toolkit";

// Define types for node-web-audio-api
interface NodeWebAudioAPI {
  AudioContext: typeof AudioContext;
  OfflineAudioContext: typeof OfflineAudioContext;
  AudioBuffer: typeof AudioBuffer;
  AudioBufferSourceNode: typeof AudioBufferSourceNode;
  OscillatorNode: typeof OscillatorNode;
  GainNode: typeof GainNode;
  BiquadFilterNode: typeof BiquadFilterNode;
  DelayNode: typeof DelayNode;
  ConvolverNode: typeof ConvolverNode;
  DynamicsCompressorNode: typeof DynamicsCompressorNode;
  WaveShaperNode: typeof WaveShaperNode;
  StereoPannerNode: typeof StereoPannerNode;
  AnalyserNode: typeof AnalyserNode;
  ChannelMergerNode: typeof ChannelMergerNode;
  ChannelSplitterNode: typeof ChannelSplitterNode;
  AudioWorkletNode: typeof AudioWorkletNode;
  PeriodicWave: typeof PeriodicWave;
  ConstantSourceNode: typeof ConstantSourceNode;
  PannerNode: typeof PannerNode;
  AudioListener: typeof AudioListener;
  AudioParam: typeof AudioParam;
  AudioDestinationNode: typeof AudioDestinationNode;
}

// Browser exports - use native Web Audio API
let AudioContextExport: typeof AudioContext;
let OfflineAudioContextExport: typeof OfflineAudioContext;
let AudioBufferExport: typeof AudioBuffer;
let AudioBufferSourceNodeExport: typeof AudioBufferSourceNode;
let OscillatorNodeExport: typeof OscillatorNode;
let GainNodeExport: typeof GainNode;
let BiquadFilterNodeExport: typeof BiquadFilterNode;
let DelayNodeExport: typeof DelayNode;
let ConvolverNodeExport: typeof ConvolverNode;
let DynamicsCompressorNodeExport: typeof DynamicsCompressorNode;
let WaveShaperNodeExport: typeof WaveShaperNode;
let StereoPannerNodeExport: typeof StereoPannerNode;
let AnalyserNodeExport: typeof AnalyserNode;
let ChannelMergerNodeExport: typeof ChannelMergerNode;
let ChannelSplitterNodeExport: typeof ChannelSplitterNode;
let AudioWorkletNodeExport: typeof AudioWorkletNode;
let PeriodicWaveExport: typeof PeriodicWave;
let ConstantSourceNodeExport: typeof ConstantSourceNode;
let PannerNodeExport: typeof PannerNode;
let AudioListenerExport: typeof AudioListener;
let AudioParamExport: typeof AudioParam;
let AudioDestinationNodeExport: typeof AudioDestinationNode;

if (isBrowser()) {
  // Use native browser Web Audio API
  AudioContextExport = AudioContext;
  OfflineAudioContextExport = OfflineAudioContext;
  AudioBufferExport = AudioBuffer;
  AudioBufferSourceNodeExport = AudioBufferSourceNode;
  OscillatorNodeExport = OscillatorNode;
  GainNodeExport = GainNode;
  BiquadFilterNodeExport = BiquadFilterNode;
  DelayNodeExport = DelayNode;
  ConvolverNodeExport = ConvolverNode;
  DynamicsCompressorNodeExport = DynamicsCompressorNode;
  WaveShaperNodeExport = WaveShaperNode;
  StereoPannerNodeExport = StereoPannerNode;
  AnalyserNodeExport = AnalyserNode;
  ChannelMergerNodeExport = ChannelMergerNode;
  ChannelSplitterNodeExport = ChannelSplitterNode;
  AudioWorkletNodeExport = AudioWorkletNode;
  PeriodicWaveExport = PeriodicWave;
  ConstantSourceNodeExport = ConstantSourceNode;
  PannerNodeExport = PannerNode;
  AudioListenerExport = AudioListener;
  AudioParamExport = AudioParam;
  AudioDestinationNodeExport = AudioDestinationNode;
} else {
  // Use node-web-audio-api for Node.js
  try {
    // Dynamic import for Node.js environment
    // We need to use require here since this is a CJS module in Node.js
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nodeWebAudio = require("node-web-audio-api") as NodeWebAudioAPI;

    AudioContextExport = nodeWebAudio.AudioContext;
    OfflineAudioContextExport = nodeWebAudio.OfflineAudioContext;
    AudioBufferExport = nodeWebAudio.AudioBuffer;
    AudioBufferSourceNodeExport = nodeWebAudio.AudioBufferSourceNode;
    OscillatorNodeExport = nodeWebAudio.OscillatorNode;
    GainNodeExport = nodeWebAudio.GainNode;
    BiquadFilterNodeExport = nodeWebAudio.BiquadFilterNode;
    DelayNodeExport = nodeWebAudio.DelayNode;
    ConvolverNodeExport = nodeWebAudio.ConvolverNode;
    DynamicsCompressorNodeExport = nodeWebAudio.DynamicsCompressorNode;
    WaveShaperNodeExport = nodeWebAudio.WaveShaperNode;
    StereoPannerNodeExport = nodeWebAudio.StereoPannerNode;
    AnalyserNodeExport = nodeWebAudio.AnalyserNode;
    ChannelMergerNodeExport = nodeWebAudio.ChannelMergerNode;
    ChannelSplitterNodeExport = nodeWebAudio.ChannelSplitterNode;
    AudioWorkletNodeExport = nodeWebAudio.AudioWorkletNode;
    PeriodicWaveExport = nodeWebAudio.PeriodicWave;
    ConstantSourceNodeExport = nodeWebAudio.ConstantSourceNode;
    PannerNodeExport = nodeWebAudio.PannerNode;
    AudioListenerExport = nodeWebAudio.AudioListener;
    AudioParamExport = nodeWebAudio.AudioParam;
    AudioDestinationNodeExport = nodeWebAudio.AudioDestinationNode;
  } catch {
    throw new Error(
      "node-web-audio-api is required for Node.js environments. Install it with: pnpm add node-web-audio-api",
    );
  }
}

// Export all Web Audio API classes with consistent naming
export {
  AudioContextExport as AudioContext,
  OfflineAudioContextExport as OfflineAudioContext,
  AudioBufferExport as AudioBuffer,
  AudioBufferSourceNodeExport as AudioBufferSourceNode,
  OscillatorNodeExport as OscillatorNode,
  GainNodeExport as GainNode,
  BiquadFilterNodeExport as BiquadFilterNode,
  DelayNodeExport as DelayNode,
  ConvolverNodeExport as ConvolverNode,
  DynamicsCompressorNodeExport as DynamicsCompressorNode,
  WaveShaperNodeExport as WaveShaperNode,
  StereoPannerNodeExport as StereoPannerNode,
  AnalyserNodeExport as AnalyserNode,
  ChannelMergerNodeExport as ChannelMergerNode,
  ChannelSplitterNodeExport as ChannelSplitterNode,
  AudioWorkletNodeExport as AudioWorkletNode,
  PeriodicWaveExport as PeriodicWave,
  ConstantSourceNodeExport as ConstantSourceNode,
  PannerNodeExport as PannerNode,
  AudioListenerExport as AudioListener,
  AudioParamExport as AudioParam,
  AudioDestinationNodeExport as AudioDestinationNode,
};
