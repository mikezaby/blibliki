# instruments

The instrument performance console as its own web app, following the
[instruments app design](../../docs/plans/2026-09-17-instruments-app-design.md).

Three routes: `/` lists the instruments from Firestore with a name filter,
`/instrument/$instrumentId` renders the console from
[`@blibliki/instrument/react`](../../packages/instrument/README.md#the-react-entry-point),
the same one `apps/grid` and `apps/mobile` render, and `/new` is the wizard
that creates an instrument.

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
static asset or the shell, through `not_found_handling`. It answers at
`play.blibliki.com`, a custom domain in `wrangler.jsonc` that needs the
`blibliki.com` zone in the same Cloudflare account.

Pushing the `live` branch is the release, as it is for grid:
`.github/workflows/deploy.yml` builds and runs `wrangler deploy` with an API
token. The workflow reads the seven `VITE_*` values from this app's `.env`, since
they are inlined into the client bundle at build time. `VITE_FIREBASE_API_KEY`
and `VITE_CLERK_PUBLISHABLE_KEY` are repository secrets, the other five are
repository variables. `CLOUDFLARE_API_TOKEN` (an account policy with Workers
Scripts Edit and Account Settings Read, plus a zone policy on blibliki.com
with Workers Routes Edit and DNS Edit) and `CLOUDFLARE_ACCOUNT_ID` are
secrets.

From a machine with `wrangler login` done, the same deploy is
`pnpm run deploy:cloudflare`, and `pnpm exec wrangler deploy --dry-run` shows
what would ship without shipping it. Plain `pnpm deploy` is pnpm's own
command, which is why the script has the suffix.

Every page route sets `ssr: false`. SPA mode only changes the prerender, so a
page request that does reach the Worker would otherwise run the route's
loader, and the instrument loader reads Firestore, which only exists in the
browser. With it off the Worker answers with the shell.

A route's `loader` is not code-split the way its component is, and the
prerender evaluates it on the server. Anything a loader imports must
therefore stay clear of `@blibliki/instrument`, whose audio build reads
`window` as it loads. `src/recipeInstrument.ts` imports it inside
`loadInstrument` for that reason; a static import there fails the build
with "window is not defined".

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

## Creating an instrument

`/new` follows the
[instrument wizard design](../../docs/plans/2026-09-20-instrument-wizard-design.md)
in three steps: pick a recipe from `@blibliki/instrument`, optionally change
the structure (`src/InstrumentStructureEditor.tsx`: which tracks are on,
their source, effects, sequencer, and routing under "Advanced"), then name it
and create. Creating writes a new Firestore instrument and opens it in the
console. Sound is shaped there, not in the wizard.

A recipe is also an instrument: `/instrument/recipe.<id>` opens it in the
console without an account (`src/recipeInstrument.ts`). It has no owner, so
the save rules above keep a visitor's changes in a device draft. "Make it
mine" in the console header starts the wizard from that draft.

Sign-in is only asked for at the last step. The wizard keeps its state in
`sessionStorage` (`src/newInstrumentDraft.ts`), because an OAuth sign-in
leaves the page and comes back.

The keys live in this app's own `.env` (gitignored): the six
`VITE_FIREBASE_*` values and `VITE_CLERK_PUBLISHABLE_KEY`, the same ones
`apps/grid/.env` has. Without the Firebase keys the picker says so instead of
failing inside Firestore. Without the Clerk key the app refuses to start.
