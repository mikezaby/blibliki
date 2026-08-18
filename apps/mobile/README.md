# mobile — Capacitor proof of concept

Answers the one question the [Capacitor plan](../../docs/plans/2026-08-18-capacitor-mobile-plan.md)
rests on: **does the real engine run inside the iOS WKWebView?**

It loads `src/patch.json` (LFO → Scale → Wavetable, StepSequencer → Envelope →
Master — i.e. the AudioWorklet processors that killed the React Native port),
starts the transport, and shows a peak meter tapped off the signal feeding
Master. Non-zero peak = the patch is really making sound.

```bash
pnpm ios   # build + sync + run on a simulator/device
```

Result on the iOS 26 simulator (iPhone 17): 6 modules loaded, context running at
48 kHz, peak ~0.13. Worklets, blob-URL processor loading and the sequencer all
work unmodified. Autoplay also worked without a tap there — do not rely on it,
a real device still needs the user gesture.

Not done yet: MIDI (`CapacitorMidiAdapter`), audio session config, Android, the
performance UI. See the plan.
