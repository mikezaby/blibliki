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

Audio caveat to expect on Android: the Chromium WebView's AudioTrack latency is
worse than iOS's, and some devices need `latencyHint: "playback"` to avoid
glitching.

Result on the iOS 26 simulator (iPhone 17): 6 modules loaded, context running at
48 kHz, peak ~0.13. Worklets, blob-URL processor loading and the sequencer all
work unmodified. Autoplay also worked without a tap there — do not rely on it,
a real device still needs the user gesture.

Not done yet: MIDI (`CapacitorMidiAdapter`), audio session config, Android, the
performance UI. See the plan.
