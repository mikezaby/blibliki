import eslint from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig([
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  reactRefresh.configs.recommended,
  {
    plugins: {
      // TODO: migrate to flat when upgrade to version 8
      "react-hooks": reactHooks,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-globals": [
        "error",
        {
          name: "OfflineAudioCompletionEvent",
          message: "Use @blibliki/utils/web-audio-api.",
        },
        {
          name: "AudioProcessingEvent",
          message: "Use @blibliki/utils/web-audio-api.",
        },
        {
          name: "BaseAudioContext",
          message: "Use @blibliki/utils/web-audio-api.",
        },
        {
          name: "AudioContext",
          message: "Use @blibliki/utils/web-audio-api.",
        },
        {
          name: "OfflineAudioContext",
          message: "Use @blibliki/utils/web-audio-api.",
        },
        {
          name: "AudioNode",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "AudioScheduledSourceNode",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "AudioParam",
          message: "Use @blibliki/utils/web-audio-api.",
        },
        {
          name: "AudioDestinationNode",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "AudioListener",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "AudioWorklet",
          message: "Use @blibliki/utils/web-audio-api.",
        },
        {
          name: "AudioParamMap",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "PeriodicWave",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "AudioBuffer",
          message: "Use @blibliki/utils/web-audio-api.",
        },
        {
          name: "ScriptProcessorNode",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "AudioWorkletNode",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "AnalyserNode",
          message: "Use @blibliki/utils/web-audio-api.",
        },
        {
          name: "AudioBufferSourceNode",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "BiquadFilterNode",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "ChannelMergerNode",
          message: "Use @blibliki/utils/web-audio-api.",
        },
        {
          name: "ChannelSplitterNode",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "ConstantSourceNode",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "ConvolverNode",
          message: "Use @blibliki/utils/web-audio-api.",
        },
        {
          name: "DelayNode",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "DynamicsCompressorNode",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "GainNode",
          message: "Use @blibliki/utils/web-audio-api.",
        },
        {
          name: "IIRFilterNode",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "MediaStreamAudioSourceNode",
          message: "Use @blibliki/utils/web-audio-api.",
        },
        {
          name: "OscillatorNode",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "PannerNode",
          message: "Use @blibliki/utils/web-audio-api.",
        },
        {
          name: "StereoPannerNode",
          message: "use @blibliki/utils/web-audio-api.",
        },
        {
          name: "WaveShaperNode",
          message: "Use @blibliki/utils/web-audio-api.",
        },
      ],
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn", // or "error"
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/prefer-interface": "off",
      "@typescript-eslint/prefer-regexp-exec": "off",
      "@typescript-eslint/consistent-type-definitions": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowBoolean: false,
          allowAny: false,
          allowNullish: false,
        },
      ],
    },
  },
]);
