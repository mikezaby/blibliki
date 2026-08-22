# Running on a physical iPhone

The simulator needs nothing beyond Xcode. A real device additionally needs a
signing team, Developer Mode on the phone, and a trusted certificate. All three
are one-time; after that shipping a build is one command.

## Open the project in Xcode

```bash
open apps/mobile/ios/App/App.xcodeproj   # or: pnpm --filter mobile exec cap open ios
```

`cap open ios` is the same thing with Capacitor picking the path.

## What is already set up in this repo

`DEVELOPMENT_TEAM = 6F72VT88WT` (Michalis Zabaras — Personal Team) is committed
in `ios/App/App.xcodeproj/project.pbxproj`, with `CODE_SIGN_STYLE = Automatic`
and bundle id `com.blibliki.mobile`. Anyone else building on their own machine
replaces the team with their own (step 2 below); the bundle id only needs
changing if Apple says it is taken, and then it must change in
`capacitor.config.ts` (`appId`) too.

The team id is not a secret — it ships inside every built `.app` and is visible
on the App Store. The certificate and private key live in the macOS Keychain,
never in the project file, so the pbxproj is safe to commit. If a second
developer ever needs their own, move the line into `ios/debug.xcconfig` (already
the base config for both build configurations) and gitignore it.

## One-time setup

### 1. Developer Mode on the phone

Settings → Privacy & Security → Developer Mode → on → reboot. The row only
appears after the phone has been plugged into a Mac running Xcode at least once.

Check it without touching the phone:

```bash
xcrun devicectl list devices                       # get the identifier
xcrun devicectl device info details --device <id> | grep -i developerMode
```

### 2. Apple ID and signing team

Free Apple ID is enough for development; the App Store needs a paid account.

1. Open the project (command above).
2. Blue **App** project icon in the sidebar → **TARGETS → App** → **Signing &
   Capabilities**.
3. Tick **Automatically manage signing**.
4. **Team** dropdown → **Add an Account…** → sign in → pick
   `<Your Name> (Personal Team)`.

Xcode writes `DEVELOPMENT_TEAM` into the pbxproj and issues a certificate.
Verify from the shell:

```bash
security find-identity -v -p codesigning     # expect an "Apple Development: …" line
```

If Xcode reports the bundle identifier is unavailable, change it in the same
pane and mirror it into `capacitor.config.ts`.

### 3. Trust the certificate on the phone

First install fails with **Untrusted Developer**. On the phone: Settings →
General → VPN & Device Management → your Apple ID → Trust. Once per certificate.

## Shipping a build

```bash
cd apps/mobile
pnpm ios          # vite build + cap sync ios + cap run ios, then pick the device
```

To skip the device picker:

```bash
xcrun devicectl list devices                 # copy the identifier
pnpm --filter mobile exec cap run ios --target <identifier>
```

Wired for the first install. After that, tick **Connect via Network** in Xcode's
Window → Devices and Simulators and it works over Wi-Fi.

## Gotchas

- **A free account's build expires after 7 days.** Re-run `pnpm ios` to refresh
  it. Paid Developer account gives a year, or use TestFlight.
- **`The signature of Capacitor.xcframework cannot be verified`** —
  `rm -rf apps/mobile/ios/DerivedData` and run again.
- **Landscape only** by design (`UISupportedInterfaceOrientations` in
  `Info.plist`), so turn off the phone's rotation lock.
- **Firebase keys** come from `apps/grid/.env` (`vite.config.ts` points `envDir`
  there). Missing file → the picker says so instead of hanging.
- **No console on a device.** Errors render into the `<pre id="errors">` element
  outside the React root. For live logs, Safari → Develop → <phone> → the
  WKWebView inspector.
- **MIDI hardware is unverified on a real device** — the simulator exposes no USB
  MIDI. A Lightning-to-USB camera adapter plus a controller is the outstanding
  test; see the MIDI section of the [README](./README.md).
