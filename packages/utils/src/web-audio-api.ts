import { isBrowser } from "es-toolkit";

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
  AudioContextExport = window.AudioContext;
  OfflineAudioContextExport = window.OfflineAudioContext;
  AudioBufferExport = window.AudioBuffer;
  AudioBufferSourceNodeExport = window.AudioBufferSourceNode;
  OscillatorNodeExport = window.OscillatorNode;
  GainNodeExport = window.GainNode;
  BiquadFilterNodeExport = window.BiquadFilterNode;
  DelayNodeExport = window.DelayNode;
  ConvolverNodeExport = window.ConvolverNode;
  DynamicsCompressorNodeExport = window.DynamicsCompressorNode;
  WaveShaperNodeExport = window.WaveShaperNode;
  StereoPannerNodeExport = window.StereoPannerNode;
  AnalyserNodeExport = window.AnalyserNode;
  ChannelMergerNodeExport = window.ChannelMergerNode;
  ChannelSplitterNodeExport = window.ChannelSplitterNode;
  AudioWorkletNodeExport = window.AudioWorkletNode;
  PeriodicWaveExport = window.PeriodicWave;
  ConstantSourceNodeExport = window.ConstantSourceNode;
  PannerNodeExport = window.PannerNode;
  AudioListenerExport = window.AudioListener;
  AudioParamExport = window.AudioParam;
  AudioDestinationNodeExport = window.AudioDestinationNode;
} else {
  try {
    const nodeWebAudio = await import("node-web-audio-api");

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
  } catch (e) {
    console.log(e);
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
