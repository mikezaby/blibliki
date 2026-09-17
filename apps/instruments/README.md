# instruments

The instrument performance console as its own web app, following the
[instruments app design](../../docs/plans/2026-09-17-instruments-app-design.md).

Two routes: `/` lists the instruments from Firestore with a name filter, and
`/instrument/$instrumentId` renders the console from
[`@blibliki/instrument/react`](../../packages/instrument/README.md#the-react-entry-point),
the same one `apps/grid` and `apps/mobile` render.

```bash
pnpm dev       # http://localhost:4200
pnpm build     # static shell plus client bundle in dist/
```

It is a TanStack Start app in SPA mode: nothing here renders on a server, so
only the shell is prerendered. Server routes and server functions stay
available for later.

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
