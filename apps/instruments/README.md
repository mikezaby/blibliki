# instruments

The instrument performance console as its own web app, following the
[instruments app design](../../docs/plans/2026-09-17-instruments-app-design.md).

Two routes: `/` lists the instruments from Firestore with a name filter, and
`/instrument/$instrumentId` renders the console from
[`@blibliki/instrument/react`](../../packages/instrument/README.md#the-react-entry-point),
the same one `apps/grid` and `apps/mobile` render.

```bash
pnpm dev       # http://localhost:4200
pnpm build     # dist/client (shell and assets) and dist/server (the Worker)
pnpm preview   # the built Worker under the local Cloudflare runtime
```

It is a TanStack Start app in SPA mode: nothing here renders on a server, so
only the shell is prerendered, as `index.html`. Server routes and server
functions stay available for later.

## Deploying to Cloudflare

The app deploys as a Cloudflare Worker with static assets, on the free plan:
asset requests are unmetered and the Worker only runs for `/_serverFn/*` and
`/api/*` (`run_worker_first` in `wrangler.jsonc`). Every other path is a
static asset or the shell, through `not_found_handling`.

```bash
pnpm exec wrangler login
pnpm deploy                    # builds, then wrangler deploy
pnpm exec wrangler deploy --dry-run   # what would ship, without shipping
```

The `VITE_*` keys are inlined at build time, so a Cloudflare build (Workers
Builds or CI) needs them as build variables. Nothing is read at runtime.

Both page routes set `ssr: false`. SPA mode only changes the prerender, so a
page request that does reach the Worker would otherwise run the route's
loader, and the instrument loader reads Firestore, which only exists in the
browser. With it off the Worker answers with the shell.

Firebase is initialized when the client router is created (`src/router.tsx`),
not in the root route's `beforeLoad`: the shell is prerendered, so on the
client the root match is restored from the dehydrated state and that hook
never runs in the browser.

`pnpm dev` logs a React hydration mismatch on every page. The dev server
renders the pending boundary of an `ssr: false` route while the client
already has the component; React regenerates the tree and the page works.
The built shell does not produce it.

When a local run misbehaves, check for a leftover `workerd` process first:
`pnpm preview` and `wrangler dev` do not always take their runtime down with
them, and a stale one keeps serving the previous build.

## Instruments and saving

Reads are anonymous, as in `apps/mobile`. Sign-in is Clerk, with the Clerk
session exchanged for a Firebase custom token (`src/auth.tsx`, the same
exchange grid does) so Firestore accepts writes.

What the controller's save command does depends on who is looking
(`src/persistInstrument.ts`):

- the signed-in owner of the instrument writes it back to Firestore
- anyone else keeps a per-instrument draft in `localStorage`
  (`src/instrumentStore.ts`), and the console opens that draft in preference
  to the stored instrument

Discard deletes the draft and reloads from Firestore. Grid saves regardless of
owner; the check here is deliberate, so a visitor can never overwrite
someone's instrument.

The keys live in this app's own `.env` (gitignored): the six
`VITE_FIREBASE_*` values and `VITE_CLERK_PUBLISHABLE_KEY`, the same ones
`apps/grid/.env` has. Without the Firebase keys the picker says so instead of
failing inside Firestore. Without the Clerk key the app refuses to start.
