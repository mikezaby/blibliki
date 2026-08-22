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

## Installing on someone else's device

The device's Apple ID is irrelevant — it never enters into it. A development
install is gated by _your_ certificate and by the device being registered to
_your_ provisioning profile, not by who is signed in on the device.

With the free account that means the device has to come to the Mac:

1. Plugged in over a cable — there is no over-the-air path on a free account.
2. Developer Mode enabled, which is only offered _after_ the device has been
   connected to a Mac running Xcode.
3. Its owner trusts the certificate (Settings → General → VPN & Device
   Management), which needs their passcode.
4. Repeat every 7 days, or the app stops launching.

Step 4 is the one that decides it. Fine for "try this while I'm visiting",
useless for a device that lives somewhere else.

### TestFlight

Easier for the tester, more work per build for you. They install TestFlight,
accept an emailed invite, and builds last 90 days — no cable, no Mac, no
Developer Mode, no certificate trust. In exchange each release is bump
`CURRENT_PROJECT_VERSION` → Product → Archive → upload → ~10 minutes of
processing, rather than one `pnpm ios`.

Setup, once: paid account, an App Store Connect record matching the bundle id,
and export compliance (this app is HTTPS-only, so it is exempt — set
`ITSAppUsesNonExemptEncryption = false` in `Info.plist` once and stop being
asked). The 1024px icon in `Assets.xcassets` is still the stock Capacitor logo;
replace it before anyone else sees it.

**Internal** testers (100 max) skip Beta App Review and get builds in minutes,
but each must be a user on the App Store Connect team. **External** testers
(10,000, just an email address) need a review on the first build of a version —
about a day. For one person, internal is less waiting.

## What the paid account buys

$99/yr, and it lifts real limits rather than just licensing you:

- **Profiles valid a year instead of 7 days**, on every device. For most hobby
  projects this alone is the reason to pay.
- **100 devices per family per year**, against the free tier's 10 App IDs per
  week and ~3 apps installed per device.
- **TestFlight** and App Store distribution.
- **AUv3 audio unit extensions** — how an iOS instrument loads _inside_ AUM,
  GarageBand, Logic or Cubasis instead of being a standalone app. Distribution
  goes through the App Store, so it needs the paid account. For this project
  that is a larger unlock than TestFlight.
- Entitlement-gated capabilities generally: push notifications, iCloud/CloudKit,
  App Groups, Sign in with Apple. Free accounts cannot provision any of them.
  Background audio is _not_ one of these — it is an `Info.plist` key and works
  free.
- Xcode Cloud (25 compute hours/month), 2 code-level support incidents a year,
  App Store Connect analytics, Ad Hoc distribution.

Not a reason to pay: beta iOS and Xcode releases, free to everyone since 2023.

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
