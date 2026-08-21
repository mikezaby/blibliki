# mobile — Capacitor app

Runs the Blibliki performance instrument on iOS, following the
[Capacitor plan](../../docs/plans/2026-08-18-capacitor-mobile-plan.md).

The app is two screens: pick an instrument, then play it. The second is the
performance console from
[`@blibliki/instrument/react`](../../packages/instrument/README.md#the-react-entry-point) —
the same one `apps/grid` renders. `src/App.tsx` supplies the two things the
console does not own: the instrument document and where it is stored.

```bash
pnpm ios   # build + sync + run on a simulator/device
pnpm dev   # same app in a desktop browser — where Web MIDI actually works
```

## Instruments

`src/InstrumentPicker.tsx` lists the instruments from Firestore — the same ones
grid shows, because `Instrument.all()` is not filtered by user — with a filter
field over the names. Picking one loads the console; the console's `backSlot`
holds an "Instruments" button back to the list. That first tap also serves as
the user gesture iOS wants before audio starts.

There is no sign-in, so this is **read-only against Firestore**. Editing still
works: the controller's save command writes a per-instrument draft to
`localStorage` (`src/instrumentStore.ts`), and the console opens that draft in
preference to the stored instrument. Discard deletes the draft and reloads from
the cloud. Drafts are migrated on read, and one that no longer parses is
ignored rather than blocking the instrument from opening.

The Firebase keys are grid's: `vite.config.ts` points `envDir` at
`apps/grid`, so both apps read one `.env` rather than keeping two copies of the
same six secrets. They are the same keys the web app ships to the browser —
reads are open by design and nothing can be written without a login this app
does not have. If that file is missing, the picker says so instead of failing
somewhere inside Firestore.

A Launch Control XL3 is optional — encoder cells drag vertically and answer
arrow keys, synthesizing the same relative CC events the hardware sends.

The app is **landscape only** (`UISupportedInterfaceOrientations` in
`ios/App/App/Info.plist`, both the phone and iPad arrays). The console is a wide
faceplate — three bands of eight encoders — so it wants the long axis across.
This is a native app setting rather than device detection in JS, which is why it
is always right.

Errors go to a `<pre id="errors">` element that lives outside the React root, so
they still show when the app itself is what broke. There is no console on a
device.

Not stored yet: which instrument was open last, so the picker comes up every
launch. Worth adding if that gets annoying between sets.

### The proof of concept this replaced

Before the console, this app was a harness that loaded one of two exported
patches (LFO → Scale → Wavetable driven by a StepSequencer, and the same voice
played from MIDI) and tapped a peak meter off the signal feeding Master. It
answered its question — on the iOS 26 simulator (iPhone 17) 6 modules loaded,
the context ran at 48 kHz and peak read ~0.13, so worklets, blob-URL processor
loading and the sequencer all work unmodified in WKWebView. Autoplay also worked
without a tap there; do not rely on it, a real device still needs the user
gesture. Recover it from git history (`git show 72d452c9`) if a minimal patch
harness is ever needed again for debugging.

## MIDI on iOS

WKWebView has no `navigator.requestMIDIAccess` at all, so the engine is fed from
CoreMIDI instead, through a plugin written for this app:

| Layer                         | File                                                             |
| ----------------------------- | ---------------------------------------------------------------- |
| CoreMIDI ⇄ JS bridge (Swift)  | `ios/App/App/BliblikiMidiPlugin.swift`                           |
| MIDI 1.0 byte-stream parser   | `ios/App/App/MidiStreamParser.swift`                             |
| Plugin registration           | `ios/App/App/MainViewController.swift`, wired in `SceneDelegate` |
| `IMidiAdapter` implementation | `src/midi/CapacitorMidiAdapter.ts`                               |

Inputs and outputs both, as raw bytes — so sysex works, which the community
plugins do not carry (`capacitor-musetrainer-midi` is on Capacitor 4 and dead;
`@midiative/capacitor-midi-device` only reports parsed note/velocity). Ports are
listed by CoreMIDI unique id and the app repopulates on `portsChanged`.

The parser is the part with real edge cases — running status, sysex split across
packets, realtime bytes interleaved mid-message — so it lives in a file that
imports nothing but Foundation and `pnpm test` compiles and runs it against
`test/midi-parser/main.swift`. No Xcode needed.

**Still unverified: real hardware.** The iOS Simulator exposes no USB MIDI, so
the picker there shows only `Computer Keyboard`; the app reports
the absence in the on-screen error log when neither CoreMIDI nor Web MIDI is
available. Plug a controller into a real iPhone to
finish the test. Hardware controllers on iOS
need the CoreMIDI plugin + `CapacitorMidiAdapter` (plan step 4). Desktop Chrome
and the Android WebView list real devices through the existing `WebMidiAdapter`.

## Toolchain

Capacitor 8 needs **Node 22+** everywhere (this repo runs 24).

### iOS — already set up on this machine

| Tool                     | Required                  | Installed here                        |
| ------------------------ | ------------------------- | ------------------------------------- |
| Xcode                    | 26.0+                     | 26.6 (iOS 26.5 SDK)                   |
| Xcode Command Line Tools | yes                       | `/Applications/Xcode.app/…/Developer` |
| iOS Simulator runtime    | ships w/ Xcode            | iPhone 17 / 17 Pro / 17e / Air        |
| CocoaPods                | only for pod-only plugins | 1.17.0 (mise ruby 3.4.10)             |

The iOS project uses Swift Package Manager (`ios/App/CapApp-SPM`), so CocoaPods
is not on the critical path.

```bash
xcode-select --install                                  # if CLT missing
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
xcrun simctl list devices available                     # pick a target UDID
npx cap run ios --target <UDID>                          # skip the picker
```

Running on a **physical device** additionally needs a signing team: open
`ios/App/App.xcodeproj`, Signing & Capabilities → pick your Apple ID (a free
account is enough for development; the App Store needs a paid Developer
account).

### Android — not installed yet

Needed to add the Android target (where Web MIDI works for free in the Chromium
WebView, per the plan):

1. **Android Studio 2025.2.1 or newer** — `brew install --cask android-studio`,
   then run it once and let the setup wizard install the SDK. It also brings its
   own JDK; do not install a separate one (this machine has JDK 23 on `PATH`,
   which Gradle should ignore in favour of Studio's bundled JBR — export
   `JAVA_HOME` to Studio's JDK if a CLI build complains).
2. **SDK components** (Studio → Settings → Languages & Frameworks → Android SDK):
   - SDK Platform **API 36 (Android 16)** — anything ≥ API 24 works
   - Android SDK Build-Tools, Platform-Tools, Command-line Tools
   - Android Emulator + a system image (e.g. Pixel 8, API 36)
3. **Shell environment** (`~/.zshrc`):
   ```bash
   export ANDROID_HOME="$HOME/Library/Android/sdk"
   export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin"
   ```
4. **An AVD** — Studio's Device Manager, or `avdmanager create avd -n pixel -k "system-images;android-36;google_apis;arm64-v8a"`.
5. Then add the platform:
   ```bash
   pnpm --filter mobile add @capacitor/android
   pnpm --filter mobile exec cap add android
   pnpm --filter mobile exec cap run android
   ```

If `xcodebuild` fails with _"The signature of Capacitor.xcframework cannot be
verified"_, delete `ios/DerivedData` and run again.

Audio caveat to expect on Android: the Chromium WebView's AudioTrack latency is
worse than iOS's, and some devices need `latencyHint: "playback"` to avoid
glitching.

Not done yet: audio session config and Android. See the plan.
