function UnsupportedServerAudioContext() {
  throw new Error("Web Audio is only available in the grid client runtime.");
}

export const AudioContext = UnsupportedServerAudioContext;
export const OfflineAudioContext = UnsupportedServerAudioContext;
export const AnalyserNode = UnsupportedServerAudioContext;
export const AudioBuffer = UnsupportedServerAudioContext;
export const AudioBufferSourceNode = UnsupportedServerAudioContext;
export const AudioDestinationNode = UnsupportedServerAudioContext;
export const AudioListener = UnsupportedServerAudioContext;
export const AudioParam = UnsupportedServerAudioContext;
export const AudioWorkletNode = UnsupportedServerAudioContext;
export const BiquadFilterNode = UnsupportedServerAudioContext;
export const ChannelMergerNode = UnsupportedServerAudioContext;
export const ChannelSplitterNode = UnsupportedServerAudioContext;
export const ConstantSourceNode = UnsupportedServerAudioContext;
export const ConvolverNode = UnsupportedServerAudioContext;
export const DelayNode = UnsupportedServerAudioContext;
export const DynamicsCompressorNode = UnsupportedServerAudioContext;
export const GainNode = UnsupportedServerAudioContext;
export const OscillatorNode = UnsupportedServerAudioContext;
export const PannerNode = UnsupportedServerAudioContext;
export const PeriodicWave = UnsupportedServerAudioContext;
export const StereoPannerNode = UnsupportedServerAudioContext;
export const WaveShaperNode = UnsupportedServerAudioContext;
