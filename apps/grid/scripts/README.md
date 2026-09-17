# Build Scripts

## generate-firebase-config.js

This script generates a static `firebase-config.json` file in the `public/api/` directory.

### What it does:

1. Reads environment variables from `.env` file
2. Extracts Firebase configuration (VITE*FIREBASE*\*)
3. Creates `public/api/firebase-config.json` with the config

### When it runs:

- Automatically before `pnpm dev`
- Automatically before `pnpm build`
- Manually via `pnpm generate:firebase-config`

### Why:

This allows the Raspberry Pi device to fetch Firebase configuration as a static JSON file from the Grid app, without needing complex middleware or API routes. The file is served by Vite's static file server.

### Production deployment:

The app deploys as a Cloudflare Worker with static assets and no Worker code
(`wrangler.jsonc`). Pushing the `live` branch runs `.github/workflows/deploy.yml`,
which builds with the `VITE_*` repository secrets and runs `wrangler deploy`.
Every path that is not a file gets `index.html`, and
`public/api/firebase-config.json` ships as a static file with its JSON content
type, so the Pi keeps fetching it from the same URL.
