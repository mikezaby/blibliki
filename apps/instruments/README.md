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

Reads are anonymous, as in `apps/mobile`. There is no sign-in yet, so the
controller's save command writes a per-instrument draft to `localStorage`
(`src/instrumentStore.ts`), and the console opens that draft in preference to
the stored instrument. Discard deletes the draft and reloads from Firestore.

The Firebase keys live in this app's own `.env` (gitignored), the same six
`VITE_FIREBASE_*` values `apps/grid/.env` has. Without them the picker says so
instead of failing inside Firestore.
