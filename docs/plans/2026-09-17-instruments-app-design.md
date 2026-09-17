# Instruments App Design

Status: agreed 2026-09-17. Routes, picker, drafts and sign-in landed; the
Cloudflare deploy is still to come.

## Why

Instrument performance lives at the bottom of grid's menus: `/instruments`,
open one, then a "Performance" button. It cannot grow there without dragging
the patch editor's Redux store, header and Firebase bootstrap along. The
Capacitor app in `apps/mobile` already proved the console stands on its own:
a picker, the console from `@blibliki/instrument/react`, and a draft store.

This document moves that standalone app to the web as `apps/instruments`,
with the same feature set the mobile app has today, so it can grow into its
own product later.

## Shape

A new TanStack Start app in `apps/instruments`, built with Vite, Tailwind v4,
`@blibliki/ui`, `@blibliki/instrument/react`, `@blibliki/models` and
`@blibliki/engine`.

SPA mode is on (`tanstackStart({ spa: { enabled: true } })`). Everything the
app does is Web Audio, Web MIDI and the Firebase client SDK, none of which
render on a server, so SSR would only add ways to break. SPA mode keeps
server functions and server routes available, so an API can be added later
without changing the app's shape. The static output also stays wrappable by
Capacitor, which keeps the door open to `apps/mobile` pointing at this build
instead of keeping its own copy of the picker.

No state library. The route loader holds the instrument, the console owns
its own state, and localStorage is the draft store. If a store is needed
later, reach for the TanStack ecosystem first (TanStack Query for Firestore
reads, TanStack Store for client state) and Zustand only if neither fits.
Redux stays in grid.

## Routes

- `/` lists instruments: the picker and name filter from `apps/mobile`, a
  sign-in button when signed out, Clerk's user button when signed in.
- `/instrument/$instrumentId` is the console. The loader calls
  `Instrument.find`; the page renders the console with a back link to `/`
  and the fullscreen toggle.

## Auth

`ClerkProvider` wraps the app with the same publishable key grid uses. The
Clerk-to-Firebase custom token hook (`useFirebase` in
`apps/grid/src/hooks/index.ts`) is copied unchanged. Firestore reads stay
anonymous, as they are for mobile today.

## Save model

One branch in the console's `onPersist`:

- Signed in and the instrument's `userId` matches the user: write to
  Firestore, notice "Firestore updated". This is what grid's performance
  route does.
- Otherwise: write a per-instrument draft to localStorage, notice "Draft
  stored on device". This is the store from `apps/mobile/src/instrumentStore.ts`.
  Discard clears the draft and reloads from Firestore.

Grid saves any instrument regardless of owner. The owner check is added
here because a public app must not let a visitor overwrite someone else's
instrument, and the draft path gives visitors a place to keep their edits.

Create, clone and delete stay in grid for v1.

## Deploy

Cloudflare Workers with static assets, on the free plan: static asset
requests are unmetered and Worker invocations get 100k per day, which a SPA
barely touches.

Following the TanStack Start hosting guide: `@cloudflare/vite-plugin` and
`wrangler` as dev dependencies, the Cloudflare plugin first in the Vite
plugin list, `wrangler.jsonc` with `main` set to the Start server entry and
`nodejs_compat` in `compatibility_flags`, and a `deploy` script that runs
`wrangler deploy` after the build.

Firebase and Clerk keys come from the app's own `.env`. Mobile keeps
reading grid's. CI is unchanged. Deploys are run by a human.

## Testing

Vitest with jsdom, as in `apps/mobile`: the draft store, the name filter,
and the persist branch with a fake Instrument. No route tests in v1.

## Left out on purpose

- Server functions or any Cloudflare data store. Nothing needs a backend yet.
- Merging `apps/mobile` into this app. First get the web app live.
- Removing grid's instrument routes. They keep working until the new app
  has replaced them in practice.

## Alternatives rejected

- Keep a Vite SPA with TanStack Router only, as grid does. Cheaper today,
  but the app is meant to grow and Start's SPA mode costs nothing extra
  while keeping server routes one file away.
- Full SSR. The Firebase client SDK and the audio engine do not run on a
  Worker, and there is nothing to render before the user picks an
  instrument.
- No login at all, as mobile has. A web app with drafts stuck on one
  device is a dead end for saving work.
