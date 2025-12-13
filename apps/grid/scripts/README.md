# Build Scripts

## generate-firebase-config.js

This script generates a static `firebase-config.json` file in the `public/api/` directory.

### What it does:

1. Reads environment variables from `.env` file
2. Extracts Firebase configuration (VITE*FIREBASE*\*)
3. Creates `public/api/firebase-config.json` with the config
4. Creates `public/_redirects` file for Netlify SPA routing

### When it runs:

- Automatically before `pnpm dev`
- Automatically before `pnpm build`
- Manually via `pnpm generate:firebase-config`

### Why:

This allows the Raspberry Pi device to fetch Firebase configuration as a static JSON file from the Grid app, without needing complex middleware or API routes. The file is served by Vite's static file server.

### Production deployment:

For production, make sure to:

1. Set the Firebase environment variables in your hosting platform
2. Run the build script which will generate the config file
3. The `public/api/firebase-config.json` will be included in the build output
4. The `public/_redirects` file handles SPA routing on Netlify

### Netlify Configuration:

This script works together with `netlify.toml` to enable:

- Client-side routing (all routes serve `index.html`)
- Correct Content-Type headers for API JSON files
